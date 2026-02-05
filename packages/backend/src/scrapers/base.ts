import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import { SourceType } from '@prisma/client';

export interface ScrapedCase {
	brand: string;
	caseTitle: string;
	sourceUrl: string;
	deadline?: Date;
	description?: string;
}

/**
 * BaseScraper - Abstract base class for all web scrapers
 * 
 * To create a new scraper:
 * 
 * 1. Create a new file (e.g., newscraper.ts)
 * 2. Extend this class:
 *    ```typescript
 *    export class NewScraper extends BaseScraper {
 *      protected sourceName = 'NewSource' as const; // Must match SourceType enum
 *      protected baseUrl = 'https://example.com';
 *      
 *      public async scrape(): Promise<ScrapedCase[]> {
 *        const $ = await this.fetchPage(this.baseUrl);
 *        const cases: ScrapedCase[] = [];
 *        
 *        // Your scraping logic here
 *        $('.case-item').each((i, el) => {
 *          cases.push({
 *            brand: this.extractBrandFromTitle($(el).find('.title').text()),
 *            caseTitle: $(el).find('.title').text(),
 *            sourceUrl: $(el).find('a').attr('href') || '',
 *            deadline: this.parseDate($(el).find('.deadline').text()),
 *            description: $(el).find('.desc').text(),
 *          });
 *        });
 *        
 *        return cases;
 *      }
 *    }
 *    ```
 * 
 * 3. Register it in scrapers/run.ts by adding it to the constructor
 * 4. Add the source to the SourceType enum in prisma/schema.prisma if needed
 */
export abstract class BaseScraper {
	protected abstract sourceName: SourceType;
	protected abstract baseUrl: string;

	protected async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
		try {
			logger.info(`Fetching: ${url}`);
			const response = await axios.get(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				},
				timeout: 30000,
			});

			return cheerio.load(response.data);
		} catch (error: any) {
			logger.error(`Failed to fetch ${url}:`, error.message);
			throw error;
		}
	}

	protected parseDate(dateStr: string): Date | undefined {
		if (!dateStr) return undefined;

		try {
			// Handle common date formats
			const cleaned = dateStr
				.replace(/deadline:?/gi, '')
				.replace(/claim by:?/gi, '')
				.replace(/file by:?/gi, '')
				.trim();

			const date = new Date(cleaned);

			if (isNaN(date.getTime())) {
				logger.warn(`Could not parse date: ${dateStr}`);
				return undefined;
			}

			return date;
		} catch (error) {
			logger.warn(`Error parsing date: ${dateStr}`, error);
			return undefined;
		}
	}

	protected extractBrandFromTitle(title: string): string {
		// Try to extract brand name from title
		// Common patterns: "Brand Name Settlement", "Brand Class Action"
		const match = title.match(/^([^-–:]+?)(?:\s+(?:settlement|class action|lawsuit|data breach))/i);
		if (match) {
			return match[1].trim();
		}

		// Fallback: take first part before separator
		const parts = title.split(/[-–:]/);
		return parts[0].trim();
	}

	public abstract scrape(): Promise<ScrapedCase[]>;

	public getSourceName(): SourceType {
		return this.sourceName;
	}
}
