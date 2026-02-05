import { BaseScraper, ScrapedCase } from './base';
import { logger } from '../utils/logger';

export class TopClassActionsScraper extends BaseScraper {
  protected sourceName = 'TopClassActions' as const;
  protected baseUrl = 'https://topclassactions.com';

  public async scrape(): Promise<ScrapedCase[]> {
    const cases: ScrapedCase[] = [];

    try {
      const $ = await this.fetchPage(
        `${this.baseUrl}/category/lawsuit-settlements/open-lawsuit-settlements/`
      );

      // Parse settlement listings
      $('.post, article, .lawsuit-item').each((_, element) => {
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

          // Try to find deadline in content
          const contentText = $el.find('.entry-content, .post-content, .excerpt').text();
          const deadlineMatch = contentText.match(/deadline[:\s]+([^.\n]+)/i);
          const deadline = deadlineMatch ? this.parseDate(deadlineMatch[1]) : undefined;

          // Get description
          const description = $el.find('.excerpt, .entry-summary').first().text().trim();

          cases.push({
            brand,
            caseTitle: title,
            sourceUrl: fullUrl,
            deadline,
            description: description || undefined,
          });

          logger.debug(`Scraped from TopClassActions: ${title}`);
        } catch (error) {
          logger.error('Error parsing TopClassActions item:', error);
        }
      });

      logger.info(`TopClassActions: Found ${cases.length} cases`);
    } catch (error) {
      logger.error('Error scraping TopClassActions:', error);
      throw error;
    }

    return cases;
  }
}
