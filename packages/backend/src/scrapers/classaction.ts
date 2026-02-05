import { BaseScraper, ScrapedCase } from './base';
import { logger } from '../utils/logger';

export class ClassActionScraper extends BaseScraper {
  protected sourceName = 'ClassActionOrg' as const;
  protected baseUrl = 'https://www.classaction.org';

  public async scrape(): Promise<ScrapedCase[]> {
    const cases: ScrapedCase[] = [];

    try {
      const $ = await this.fetchPage(`${this.baseUrl}/settlements`);

      // Parse settlement listings
      $('.post, article, .settlement-card').each((_, element) => {
        try {
          const $el = $(element);

          // Get title and link
          const $link = $el.find('h2 a, h3 a, .entry-title a').first();
          const title = $link.text().trim();
          const link = $link.attr('href');

          if (!title || !link) return;

          const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;

          // Extract brand
          const brand = this.extractBrandFromTitle(title);

          // Try to find deadline
          const deadlineText = $el.find('.deadline, .meta, time').text();
          const deadline = this.parseDate(deadlineText);

          // Get description/excerpt
          const description = $el.find('.excerpt, .entry-summary, .post-excerpt').first().text().trim();

          cases.push({
            brand,
            caseTitle: title,
            sourceUrl: fullUrl,
            deadline,
            description: description || undefined,
          });

          logger.debug(`Scraped from ClassAction.org: ${title}`);
        } catch (error) {
          logger.error('Error parsing ClassAction.org item:', error);
        }
      });

      logger.info(`ClassAction.org: Found ${cases.length} cases`);
    } catch (error) {
      logger.error('Error scraping ClassAction.org:', error);
      throw error;
    }

    return cases;
  }
}
