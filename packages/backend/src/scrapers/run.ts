import cron from 'node-cron';
import { ClaimDepotScraper } from './claimdepot';
import { ClassActionScraper } from './classaction';
import { TopClassActionsScraper } from './topclassactions';
import { deduplicationService } from '../services/deduplication.service';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { BaseScraper } from './base';

/**
 * ScraperManager - Orchestrates all web scrapers
 * 
 * Usage:
 *   const manager = ScraperManager.getInstance();
 *   await manager.init(); // Run immediately and schedule recurring scrapes
 * 
 * To add a new scraper:
 *   1. Create a new class extending BaseScraper
 *   2. Add it to the scrapers array in the constructor
 */
class ScraperManager {
  private static instance: ScraperManager;
  private scrapers: BaseScraper[] = [];
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  private constructor() {
    // Register all scrapers here - easy to add new ones!
    this.registerScraper(new ClaimDepotScraper());
    this.registerScraper(new ClassActionScraper());
    this.registerScraper(new TopClassActionsScraper());

    // To add a new scraper, just add a line here:
    // this.registerScraper(new YourNewScraper());
  }

  public static getInstance(): ScraperManager {
    if (!ScraperManager.instance) {
      ScraperManager.instance = new ScraperManager();
    }
    return ScraperManager.instance;
  }

  /**
   * Register a new scraper
   */
  private registerScraper(scraper: BaseScraper): void {
    this.scrapers.push(scraper);
    logger.info(`Registered scraper: ${scraper.getSourceName()}`);
  }

  /**
   * Initialize the scraper system
   * Runs an initial scrape immediately, then schedules recurring scrapes
   */
  public async init(options?: {
    runImmediately?: boolean;
    cronSchedule?: string;
  }): Promise<void> {
    const {
      runImmediately = true,
      cronSchedule = '0 * * * *' // Every hour by default
    } = options || {};

    logger.info(`Initializing ScraperManager with ${this.scrapers.length} scrapers`);

    // Run initial scrape if requested
    if (runImmediately) {
      logger.info('Running initial scrape...');
      await this.runAll();
    }

    // Schedule recurring scrapes
    this.schedule(cronSchedule);

    logger.info('ScraperManager initialization complete');
  }

  /**
   * Schedule recurring scrapes
   */
  private schedule(cronSchedule: string): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.cronJob = cron.schedule(cronSchedule, async () => {
      logger.info('Starting scheduled scrape run...');
      await this.runAll();
    });

    logger.info(`Scrapers scheduled with cron: ${cronSchedule} (every hour)`);
  }

  /**
   * Run all registered scrapers
   */
  public async runAll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scrape already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('Starting scrape run for all sources...');
      const startTime = Date.now();

      for (const scraper of this.scrapers) {
        await this.runScraper(scraper);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`All scrapers completed in ${duration}s`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a single scraper
   */
  private async runScraper(scraper: BaseScraper): Promise<void> {
    const sourceName = scraper.getSourceName();
    const startTime = new Date();

    // Create scrape history record
    const history = await prisma.scrapeHistory.create({
      data: {
        source: sourceName,
        startedAt: startTime,
        status: 'running',
      },
    });

    try {
      logger.info(`[${sourceName}] Starting scrape...`);

      const scrapedCases = await scraper.scrape();

      let added = 0;
      let skipped = 0;
      let flagged = 0;

      for (const scrapedCase of scrapedCases) {
        try {
          const result = await deduplicationService.addOrUpdateCase({
            ...scrapedCase,
            source: sourceName,
          });

          if (result.action === 'added') {
            added++;
          } else if (result.action === 'flagged') {
            flagged++;
          } else if (result.action === 'skipped') {
            skipped++;
          }
        } catch (error: any) {
          logger.error(`[${sourceName}] Failed to add case: ${scrapedCase.caseTitle}`, error);
          skipped++;
        }
      }

      // Update scrape history
      await prisma.scrapeHistory.update({
        where: { id: history.id },
        data: {
          completedAt: new Date(),
          status: 'completed',
          casesFound: scrapedCases.length,
          casesAdded: added + flagged,
          casesSkipped: skipped,
        },
      });

      logger.info(
        `[${sourceName}] Completed: ${scrapedCases.length} found, ${added} new, ${flagged} flagged, ${skipped} skipped`
      );
    } catch (error: any) {
      logger.error(`[${sourceName}] Scraper failed:`, error);

      // Update scrape history with error
      await prisma.scrapeHistory.update({
        where: { id: history.id },
        data: {
          completedAt: new Date(),
          status: 'failed',
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * Get list of registered scrapers
   */
  public getScrapers(): BaseScraper[] {
    return this.scrapers;
  }

  /**
   * Stop scheduled scrapes
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scraper schedule stopped');
    }
  }
}

// Export singleton instance
export const scraperManager = ScraperManager.getInstance();

// Allow running directly via command line
if (require.main === module) {
  scraperManager
    .runAll()
    .then(() => {
      logger.info('Scrape completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scrape failed:', error);
      process.exit(1);
    });
}
