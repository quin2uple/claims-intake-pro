import { BaseScraper, ScrapedCase } from './base';
import { logger } from '../utils/logger';
import puppeteer, { Browser, Page } from 'puppeteer';

export class TopClassActionsScraper extends BaseScraper {
  protected sourceName = 'TopClassActions' as const;
  protected baseUrl = 'https://topclassactions.com';
  private browser: Browser | null = null;
  private page: Page | null = null;

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        timeout: 60000, // Browser launch timeout
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      // Set default navigation timeout
      await this.page.setDefaultNavigationTimeout(60000);
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  public async scrape(): Promise<ScrapedCase[]> {
    const cases: ScrapedCase[] = [];
    const maxPages = 20; // Limit to prevent infinite loops

    try {
      await this.initBrowser();
      if (!this.page) throw new Error('Failed to initialize browser');

      const baseUrl = `${this.baseUrl}/category/lawsuit-settlements/open-lawsuit-settlements/`;
      logger.info(`Scraping TopClassActions: ${baseUrl}`);

      let retries = 3;
      let pageLoaded = false;

      while (retries > 0 && !pageLoaded) {
        try {
          await this.page.goto(baseUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
          });

          await this.page.waitForSelector('li.single-post-wrap', {
            timeout: 15000,
          });

          pageLoaded = true;
        } catch (navError) {
          retries--;
          logger.warn(`Navigation attempt failed, retries left: ${retries}`, navError);
          if (retries === 0) {
            throw navError;
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      let pageNum = 1;
      let hasMorePages = true;

      while (hasMorePages && pageNum <= maxPages) {
        logger.info(`Scraping TopClassActions page ${pageNum}`);

        try {
          // Scroll to load lazy content
          await this.autoScroll(this.page);

          // Wait a bit for content to fully load after scroll
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Extract settlement data
          const pageData = await this.page.evaluate(() => {
            const settlements: Array<{
              title: string;
              url: string;
              deadline: string | null;
              settlement: string | null;
            }> = [];

            // Find all settlement cards - they are in li.single-post-wrap elements
            // @ts-ignore - document is available in browser context
            const cards = document.querySelectorAll('li.single-post-wrap');

            // @ts-ignore - Element is available in browser context
            cards.forEach((card: Element) => {
              try {
                if (card.querySelector('[data-fuse]')) {
                  return;
                }

                // Get title and URL - title is in h4.name inside an anchor
                const titleElement = card.querySelector('h4.name') || card.querySelector('.single-post-content a h4');
                const linkElement = card.querySelector('.single-post-content > a[href*="settlement"]');

                if (!titleElement || !linkElement) return;

                const title = (titleElement.textContent || '').trim();
                const url = linkElement.getAttribute('href') || '';

                if (!title || !url) return;

                // Find deadline - it's in a div with h5 containing "Deadline" followed by a span
                let deadline: string | null = null;
                const deadlineSection: any = Array.from(card.querySelectorAll('h5')).find(
                  (h5: any) => h5.textContent?.includes('Deadline')
                );
                if (deadlineSection) {
                  const deadlineSpan = deadlineSection.parentElement?.querySelector('span[style*="font-size:16px"]');
                  if (deadlineSpan) {
                    deadline = (deadlineSpan.textContent || '').trim();
                  }
                }

                // Find settlement amount - it's in a div with h5 containing "Settlement" followed by a span
                let settlement: string | null = null;
                const settlementSection: any = Array.from(card.querySelectorAll('h5')).find(
                  (h5: any) => h5.textContent?.includes('Settlement')
                );
                if (settlementSection) {
                  const settlementSpan = settlementSection.parentElement?.querySelector('span[style*="font-size:16px"]');
                  if (settlementSpan) {
                    settlement = (settlementSpan.textContent || '').trim();
                  }
                }

                settlements.push({
                  title,
                  url,
                  deadline,
                  settlement,
                });
              } catch (error) {
                console.error('Error parsing settlement card:', error);
              }
            });

            return settlements;
          });

          logger.info(`Found ${pageData.length} settlements on page ${pageNum}`);

          // Process each settlement
          for (const data of pageData) {
            try {
              const fullUrl = data.url.startsWith('http')
                ? data.url
                : `${this.baseUrl}${data.url}`;

              // Extract brand from title
              const brand = this.extractBrandFromTitle(data.title);

              // Parse deadline
              let deadline: Date | undefined;
              if (data.deadline) {
                deadline = this.parseDate(data.deadline);
              }

              cases.push({
                brand,
                caseTitle: data.title,
                sourceUrl: fullUrl,
                deadline,
                description: data.settlement || undefined,
              });

              logger.debug(`Scraped from TopClassActions: ${data.title}`);
            } catch (error) {
              logger.error('Error processing TopClassActions item:', error);
            }
          }

          // Check if next button is inactive (last page)
          const nextButtonState = await this.page.evaluate(() => {
            // @ts-ignore - document is available in browser context
            const nextButton = document.querySelector('li.next-arrow');
            if (!nextButton) return { exists: false, isInactive: true };

            const isInactive = nextButton.classList.contains('inactive');
            return { exists: true, isInactive };
          });

          if (!nextButtonState.exists || nextButtonState.isInactive) {
            logger.info('Reached last page (next button is inactive)');
            hasMorePages = false;
            break;
          }

          // Click the next button to go to next page
          logger.info('Clicking next button to load next page...');
          await this.page.evaluate(() => {
            // @ts-ignore - document is available in browser context
            const nextButton: any = document.querySelector('li.next-arrow');
            if (nextButton && !nextButton.classList.contains('inactive')) {
              nextButton.click();
            }
          });

          // Wait for new content to load after clicking next
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Wait for the page to update (cards to refresh)
          await this.page.waitForSelector('li.single-post-wrap', {
            timeout: 10000,
          });

          pageNum++;
        } catch (error) {
          logger.error(`Error scraping page ${pageNum}:`, error);
          break;
        }
      }

      logger.info(`TopClassActions: Total cases found: ${cases.length}`);
    } catch (error) {
      logger.error('Error scraping TopClassActions:', error);
      throw error;
    } finally {
      await this.closeBrowser();
    }

    return cases;
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          // @ts-ignore - document and window are available in browser context
          const scrollHeight = document.body.scrollHeight;
          // @ts-ignore
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
}
