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
		let cleanTitle = title.replace(/^\$[\d,.]+(M|K|B)?\s+/i, '').trim();

		const parts = cleanTitle.split(/\s+(?:class\s+action|settlement|lawsuit)/i);
		if (parts.length > 0 && parts[0].trim()) {
			let brand = parts[0].trim();
			brand = brand.replace(/\s+(subscription|deceptive\s+discounts?|text\s+messages?|data\s+breach|privacy|security|false\s+advertising)$/i, '').trim();
			brand = brand.replace(/[-–:]\s*$/, '').trim();

			if (brand) {
				return brand;
			}
		}

		const separatorParts = title.split(/[-–:]/);
		return separatorParts[0].trim();
	}

	public abstract scrape(): Promise<ScrapedCase[]>;

	public getSourceName(): SourceType {
		return this.sourceName;
	}
}
