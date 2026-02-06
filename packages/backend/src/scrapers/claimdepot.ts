import { BaseScraper, ScrapedCase } from './base';
import { logger } from '../utils/logger';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export class ClaimDepotScraper extends BaseScraper {
	protected sourceName = 'ClaimDepot' as const;
	protected baseUrl = 'https://www.claimdepot.com';

	public async scrape(): Promise<ScrapedCase[]> {
		const cases: ScrapedCase[] = [];
		const seenUrls = new Set<string>(); // Track URLs to avoid duplicates
		let browser;

		try {
			logger.info('Launching browser for ClaimDepot...');

			// Launch headless browser
			browser = await puppeteer.launch({
				headless: true,
				executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--disable-software-rasterizer',
					'--disable-dev-shm-usage',
				],
			});

			const page = await browser.newPage();

			// Set a realistic user agent
			await page.setUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			);

			logger.info(`Navigating to: ${this.baseUrl}/settlements`);
			await page.goto(`${this.baseUrl}/settlements`, {
				waitUntil: 'networkidle2',
				timeout: 30000,
			});
			logger.info('Page loaded, waiting for settlement links...');

			// Wait for settlement cards to load
			await page.waitForSelector('a[href*="/settlements/"]', { timeout: 10000 });
			logger.info('Settlement links loaded. Will filter by "Open for Claims" status during scraping.');

			// Now paginate through all pages using URL parameters
			let currentPage = 1;
			let hasMorePages = true;
			const maxPages = 20; // Limit to 20 pages (should cover all "Open for Claims")

			while (hasMorePages && currentPage <= maxPages) {
				logger.info(`Scraping page ${currentPage}...`);

				// Navigate to specific page if not the first page
				if (currentPage > 1) {
					const pageUrl = `${this.baseUrl}/settlements?page=${currentPage}`;
					await page.goto(pageUrl, {
						waitUntil: 'networkidle2',
						timeout: 30000,
					});
					await page.waitForSelector('a[href*="/settlements/"]', { timeout: 10000 });
					await new Promise(resolve => setTimeout(resolve, 1000));
				}

				// Get the HTML content after JavaScript execution
				const content = await page.content();
				const $ = cheerio.load(content);

				// ClaimDepot uses a card-based layout - look for settlement cards/links
				// Each settlement appears to be in a clickable container
				const settlementLinks = $('a[href*="/settlements/"]');
				logger.info(`Found ${settlementLinks.length} settlement links on page ${currentPage}`);

				settlementLinks.each((_, element) => {
					try {
						const $link = $(element);
						const href = $link.attr('href');

						if (!href || href === '/settlements' || href === '/settlements/') return;

						// Get the full URL
						const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

						// Skip if we've already seen this URL
						if (seenUrls.has(fullUrl)) return;

						// Check if this settlement is "Open for Claims" by looking at nearby status badge
						const $linkParent = $link.parent();
						const $container = $linkParent.closest('div').length ? $linkParent.closest('div') : $linkParent;
						const containerText = $container.text();

						// Debug: log what we're checking (first few cases only)
						if (cases.length < 2 && currentPage === 1) {
							logger.info(`[DEBUG] Checking link: ${href}`);
							logger.info(`[DEBUG] Container text sample: ${containerText.substring(0, 300)}`);
							logger.info(`[DEBUG] Contains "Open for Claims": ${containerText.includes('Open for Claims')}`);
						}

						// Only include if explicitly marked as "Open for Claims"
						if (!containerText.includes('Open for Claims')) {
							return;
						}

						// Extract title directly from the title link (much more reliable than text parsing)
						// Look for the <a> tag with class "c-title-3" or similar classes used for titles
						const $titleLink = $container.find('a.c-title-3, a[fs-cmssort-field="name"]');
						let title = $titleLink.text().trim();

						// Fallback: If no title link found, try parsing from container text (legacy approach)
						if (!title) {
							const fullCardText = containerText;
							let cleanText = fullCardText
								.replace(/\bOpen for Claims\b/gi, '')
								.replace(/\bClosed\b/gi, '')
								.replace(/\bPending Court Approval\b/gi, '')
								.replace(/\bPreliminar(?:y|ily) Approved\b/gi, '')
								.replace(/\bSettlement Approved\b/gi, '')
								.trim();

							const titleMatch = cleanText.match(/^([^$]+?)(?=\s*\$|\s*\d+\s*Days|January|February|March|April|May|June|July|August|September|October|November|December)/i);
							if (titleMatch) {
								title = titleMatch[1].trim();
							} else {
								const parts = cleanText.split(/\s*\$|\s+\d+\s*Days/i);
								title = parts[0].trim();
							}
						}

						// Minimal cleanup - only normalize whitespace
						title = title
							.replace(/\s+/g, ' ')
							.trim();

						// Skip if no valid title
						if (!title || title.length < 8) {
							if (cases.length < 2 && currentPage === 1) {
								logger.info(`[DEBUG] Skipping - invalid title: "${title}" (length: ${title?.length}) for ${href}`);
							}
							return;
						}

						if (cases.length < 2 && currentPage === 1) {
							logger.info(`[DEBUG] ✅ Valid title found: "${title}"`);
						}

						// Skip navigation/filter links and pagination
						const titleLower = title.toLowerCase();
						if (titleLower.includes('filter') ||
							titleLower.includes('category') ||
							titleLower.includes('reset') ||
							titleLower.includes('previous') ||
							titleLower.includes('next') ||
							titleLower.includes('page') ||
							titleLower === 'home' ||
							titleLower.includes('subscribe') ||
							titleLower.includes('newsletter') ||
							titleLower === 'no proof') {
							return;
						}

						// Skip if the URL contains pagination parameters (unless it's the settlement slug)
						if (href.includes('?page=') || href.includes('&page=')) {
							return;
						}

						// Extract brand from title
						const brand = this.extractBrandFromTitle(title);

						// Try to find deadline in the card structure
						const $parent = $link.parent();
						let deadline: Date | undefined;

						// ClaimDepot uses a specific structure: <div class="c-text-2">68</div><div class="c-text-2">Days left</div>
						// Find all c-text-2 divs in the parent container
						const $cardContainer = $parent.closest('div');
						const $daysLeftDivs = $cardContainer.find('.c-text-2, [class*="c-text"]');

						// Look for the pattern: number followed by "Days left"
						let foundDaysLeft = false;
						$daysLeftDivs.each((idx, el) => {
							const text = $(el).text().trim();

							// Check if this div contains only a number
							const numberMatch = text.match(/^(\d+)$/);
							if (numberMatch && !foundDaysLeft) {
								// Check if the next sibling or nearby element contains "Days left"
								const nextText = $(el).next().text().trim().toLowerCase();
								const parentText = $(el).parent().text().toLowerCase();

								if (nextText.includes('days left') || nextText.includes('day left') || parentText.includes('days left')) {
									const daysLeft = parseInt(numberMatch[1], 10);
									deadline = new Date();
									deadline.setDate(deadline.getDate() + daysLeft);
									foundDaysLeft = true;
									logger.debug(`Found deadline: ${daysLeft} days left for ${title}`);
								}
							}
						});

						// Fallback: Look for "X days left" pattern in text
						if (!deadline) {
							const parentText = $cardContainer.text();
							const daysLeftMatch = parentText.match(/(\d+)\s*days?\s+left/i);
							if (daysLeftMatch) {
								const daysLeft = parseInt(daysLeftMatch[1], 10);
								deadline = new Date();
								deadline.setDate(deadline.getDate() + daysLeft);
							}
						}

						// Another fallback: Look for specific date patterns (e.g., "April 14, 2026")
						if (!deadline) {
							const parentText = $cardContainer.text();
							const dateMatch = parentText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
							if (dateMatch) {
								deadline = this.parseDate(dateMatch[0]);
							}
						}

						// Get description from nearby paragraphs
						let description = $parent.find('p').first().text().trim();
						if (!description) {
							// Try to get text from the parent container
							const allText = $parent.text().trim();
							// Get first sentence or first 200 chars
							description = allText.split('.')[0] + '.';
							if (description.length > 200) {
								description = description.substring(0, 200) + '...';
							}
						}

						cases.push({
							brand,
							caseTitle: title,
							sourceUrl: fullUrl,
							deadline,
							description: description || undefined,
						});

						seenUrls.add(fullUrl); // Mark this URL as seen
						logger.debug(`Scraped from ClaimDepot: ${title}`);
					} catch (error) {
						logger.error('Error parsing ClaimDepot item:', error);
					}
				});

				logger.info(`Page ${currentPage} complete. Total cases so far: ${cases.length}. Unique URLs: ${seenUrls.size}`);

				// Check if there are more pages by looking for Next button
				try {
					const content = await page.content();
					const $ = cheerio.load(content);
					const nextButton = $('a.jetboost-pagination-next-njze');
					const isHidden = nextButton.hasClass('jetboost-hidden');

					if (isHidden) {
						logger.info('No more pages (Next button is hidden)');
						hasMorePages = false;
					} else {
						// Check if there are actually settlement links on this page
						const linksOnPage = $('a[href*="/settlements/"]').length;
						if (linksOnPage === 0) {
							logger.info('No settlement links found, stopping pagination');
							hasMorePages = false;
						} else {
							currentPage++;
						}
					}
				} catch (error) {
					logger.warn('Error checking for next page, stopping pagination:', error);
					hasMorePages = false;
				}
			}

			// Verify no duplicates in the final array
			const uniqueUrls = new Set(cases.map(c => c.sourceUrl));
			logger.info(`ClaimDepot: Found ${cases.length} total cases across ${currentPage} pages. Unique URLs in seenUrls: ${seenUrls.size}, Unique URLs in cases array: ${uniqueUrls.size}`);
		} catch (error) {
			logger.error('Error scraping ClaimDepot:', error);
			throw error;
		} finally {
			// Always close the browser
			if (browser) {
				await browser.close();
				logger.info('Browser closed');
			}
		}

		return cases;
	}
}
