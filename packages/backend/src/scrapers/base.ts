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
 * Abstract base class for web scrapers
 * Extend this class and implement the scrape() method
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
		// Remove leading colons or separators
		let cleanTitle = title.replace(/^[:–\-]\s*/g, '').trim();

		// Remove common prefixes like "No Proof:", "Proof Required:", etc.
		cleanTitle = cleanTitle.replace(/^(No\s+Proof|Proof\s+Required|Free\s+Money)\s*:\s*/i, '').trim();

		// Remove leading dollar amounts (e.g., "$78.75M")
		cleanTitle = cleanTitle.replace(/^\$[\d,.]+(M|K|B)?\s+/i, '').trim();

		// Add spaces before "SettlementUp", "SettlementVaries", etc. (common parsing errors)
		cleanTitle = cleanTitle.replace(/(settlement|lawsuit|action)(up\s+to|varies|pro\s+rata|explained)/gi, '$1 $2');

		// Split on key settlement-related phrases
		const parts = cleanTitle.split(/\s*(?:class\s+action\s+settlement|class\s+action|settlement|lawsuit)\s*/i);

		if (parts.length > 0 && parts[0].trim()) {
			let brand = parts[0].trim();

			// Remove dollar amounts anywhere in the string (e.g., "$5.5M")
			brand = brand.replace(/\s*\$[\d,.]+(M|K|B)?\s*/gi, ' ').trim();

			// Remove common descriptive suffixes
			brand = brand.replace(/\s+(subscription|deceptive\s+discounts?|text\s+messages?|data\s+breach|privacy|security|false\s+advertising|patient\s+privacy|website\s+tracking|pixel\s+tracking|fingerprint\s+time\s+clock|civil\s+rights|debt\s+collection|drivers|power\s+bank|drain\s+valve|student\s+loan\s+servicing|jet\s+fuel\s+dumping|pixel\s+tracking|surplus\s+proceeds|merger)\s*$/i, '').trim();

			// Remove trailing "Up to", "Varies", "Pro rata payment", etc.
			brand = brand.replace(/\s+(up\s+to|varies|pro\s+rata\s+payment|explained)\s*$/gi, '').trim();

			// Remove trailing separators (dash, colon, en-dash)
			brand = brand.replace(/[-–:]\s*$/g, '').trim();

			// Remove leading separators again (in case they reappeared)
			brand = brand.replace(/^[:–\-]\s*/g, '').trim();

			if (brand && brand.length > 0) {
				return brand;
			}
		}

		// Fallback: Return the first meaningful part before separator
		const separatorParts = cleanTitle.split(/[-–:]/);
		if (separatorParts.length > 0 && separatorParts[0].trim()) {
			let fallbackBrand = separatorParts[0].trim();
			// Clean up the fallback too
			fallbackBrand = fallbackBrand.replace(/\s*\$[\d,.]+(M|K|B)?\s*/gi, ' ').trim();
			fallbackBrand = fallbackBrand.replace(/^[:–\-]\s*/g, '').trim();
			return fallbackBrand;
		}

		// Last resort: return cleaned title
		return cleanTitle.substring(0, 100).trim();
	}

	public abstract scrape(): Promise<ScrapedCase[]>;

	public getSourceName(): SourceType {
		return this.sourceName;
	}
}
