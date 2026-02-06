import { BaseScraper, ScrapedCase } from './base';
import { logger } from '../utils/logger';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

export class ClassActionScraper extends BaseScraper {
  protected sourceName = 'ClassActionOrg' as const;
  protected baseUrl = 'https://www.classaction.org';
  private browser: Browser | null = null;
  private page: Page | null = null;

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      puppeteer.use(StealthPlugin());

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
        timeout: 60000,
      });

      if (!this.browser) {
        throw new Error('Failed to launch browser');
      }

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });
      await this.page.setDefaultNavigationTimeout(90000);
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async solveTurnstileCaptcha(page: Page): Promise<boolean> {
    const apiKey = process.env.TWOCAPTCHA_API_KEY;

    if (!apiKey) {
      logger.warn('2Captcha API key not configured. Cannot solve interactive challenge.');
      logger.info('Set TWOCAPTCHA_API_KEY environment variable to enable CAPTCHA solving.');
      return false;
    }

    try {
      logger.info('Attempting to solve Cloudflare Challenge page using 2Captcha API...');

      const pageUrl = page.url();

      await new Promise(resolve => setTimeout(resolve, 3000));

      const challengeParams = await page.evaluate(() => {
        // @ts-ignore
        const cfOpt = window._cf_chl_opt;
        if (!cfOpt) return null;

        return {
          action: cfOpt.cType,
          cData: cfOpt.md,
          chlPageData: cfOpt.mdrd,
        };
      });

      let sitekey = await this.extractTurnstileSitekey(page);

      if (!sitekey) {
        logger.warn('Sitekey not found, waiting for Turnstile to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        sitekey = await this.extractTurnstileSitekey(page);

        if (!sitekey) {
          logger.error('Failed to extract Turnstile sitekey');
          return false;
        }
      }

      logger.info(`Turnstile sitekey found: ${sitekey.substring(0, 10)}...`);

      const axios = require('axios');
      logger.info('Sending Cloudflare Turnstile challenge to 2Captcha...');

      const taskPayload: any = {
        clientKey: apiKey,
        task: {
          type: 'TurnstileTaskProxyless',
          websiteURL: pageUrl,
          websiteKey: sitekey,
        }
      };

      if (challengeParams) {
        if (challengeParams.cData) taskPayload.task.data = challengeParams.cData;
        if (challengeParams.chlPageData) taskPayload.task.pagedata = challengeParams.chlPageData;
        if (challengeParams.action) taskPayload.task.action = challengeParams.action;
      }

      const submitResponse = await axios.post('https://api.2captcha.com/createTask', taskPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (submitResponse.data.errorId !== 0) {
        logger.error(`2Captcha task creation failed: ${JSON.stringify(submitResponse.data)}`);
        return false;
      }

      const taskId = submitResponse.data.taskId;
      logger.info(`Task created with ID: ${taskId}`);
      logger.info('Waiting for 2Captcha to solve...');

      let solution = null;
      const maxAttempts = 60;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultResponse = await axios.post('https://api.2Captcha.com/getTaskResult', {
          clientKey: apiKey,
          taskId: taskId
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (resultResponse.data.errorId !== 0) {
          logger.error(`2Captcha error: ${JSON.stringify(resultResponse.data)}`);
          return false;
        }

        if (resultResponse.data.status === 'ready') {
          solution = resultResponse.data.solution.token;
          logger.info('✅ CAPTCHA solved successfully!');
          break;
        } else if (attempt % 6 === 0) {
          logger.info(`Processing... (${(attempt + 1) * 5}s elapsed)`);
        }
      }

      if (!solution) {
        logger.error('Timeout waiting for CAPTCHA solution');
        return false;
      }

      logger.info('Injecting CAPTCHA solution...');

      await page.evaluate((token) => {
        // @ts-ignore
        const responseInput = document.querySelector('[name="cf-turnstile-response"]');
        if (responseInput) {
          // @ts-ignore
          responseInput.value = token;
        }

        // @ts-ignore
        const grecaptchaInput = document.querySelector('[name="g-recaptcha-response"]');
        if (grecaptchaInput) {
          // @ts-ignore
          grecaptchaInput.value = token;
        }

        // @ts-ignore
        if (window.tsCallback && typeof window.tsCallback === 'function') {
          // @ts-ignore
          window.tsCallback(token);
        }

        // @ts-ignore
        const form = document.querySelector('form[action*="__cf_chl"]');
        if (form) {
          // @ts-ignore
          form.submit();
        }
      }, solution);

      try {
        await page.waitForNavigation({ timeout: 15000, waitUntil: 'networkidle0' });
        logger.info('✅ CAPTCHA verified, page loaded');
      } catch (err: any) {
        logger.info('Proceeding without navigation');
      }

      return true;
    } catch (error) {
      logger.error('Error solving Turnstile CAPTCHA:', error);
      return false;
    }
  }

  private async extractTurnstileSitekey(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      // @ts-ignore
      const turnstileDiv = document.querySelector('[data-sitekey]');
      if (turnstileDiv) {
        // @ts-ignore
        return turnstileDiv.getAttribute('data-sitekey');
      }

      // @ts-ignore
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        // @ts-ignore
        const src = iframe.src || '';
        if (src.includes('challenges.cloudflare.com') || src.includes('turnstile')) {
          const match = src.match(/[?&]sitekey=([^&]+)/);
          if (match) return match[1];
          const pathMatch = src.match(/\/b\/([a-zA-Z0-9_-]+)\//);
          if (pathMatch) return pathMatch[1];
        }
      }

      // @ts-ignore
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        // @ts-ignore
        const src = script.src || '';
        if (src && (src.includes('turnstile') || src.includes('challenges.cloudflare.com'))) {
          const pathMatch = src.match(/\/b\/([a-zA-Z0-9_-]+)\//);
          if (pathMatch) return pathMatch[1];
        }
      }

      return null;
    });
  }

  private async waitForCloudflare(page: Page): Promise<void> {
    logger.info('Checking for Cloudflare challenge...');

    try {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const hasCloudflare = await page.evaluate(() => {
        // @ts-ignore
        const text = document.body.innerText || '';
        return text.includes('Verify you are human') ||
          text.includes('Just a moment') ||
          // @ts-ignore
          document.querySelector('[name="cf-turnstile-response"]') !== null;
      });

      if (!hasCloudflare) {
        logger.info('No Cloudflare challenge detected');
        return;
      }

      logger.warn('Cloudflare challenge detected, waiting...');

      let attempts = 0;
      while (attempts < 90) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const stillBlocked = await page.evaluate(() => {
          // @ts-ignore
          const text = document.body.innerText || '';
          const hasChallenge = text.includes('Verify you are human') || text.includes('Just a moment');
          // @ts-ignore
          const hasContent = document.querySelector('.settlement-card');
          return hasChallenge && !hasContent;
        });

        if (!stillBlocked) {
          logger.info('Cloudflare challenge passed, waiting for content...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          return;
        }

        if (attempts++ % 10 === 0) {
          logger.info(`Waiting... (${attempts}s)`);
        }
      }

      const needsSolving = await page.evaluate(() => {
        // @ts-ignore
        return document.querySelector('[name="cf-turnstile-response"]') !== null;
      });

      if (needsSolving) {
        logger.warn('Interactive challenge detected, using 2Captcha...');
        const solved = await this.solveTurnstileCaptcha(page);
        if (!solved) {
          logger.warn('2Captcha could not solve the challenge');
          return;
        }
        logger.info('✅ CAPTCHA solved!');
      }
    } catch (error) {
      logger.warn('Error checking for Cloudflare:', error);
      throw error;
    }
  }

  public async scrape(): Promise<ScrapedCase[]> {
    const cases: ScrapedCase[] = [];

    try {
      await this.initBrowser();
      if (!this.page) throw new Error('Failed to initialize browser');

      const url = `${this.baseUrl}/settlements`;
      logger.info(`Scraping ClassAction.org: ${url}`);

      // Navigate to the page
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for Cloudflare if present
      await this.waitForCloudflare(this.page);

      // Wait much longer after Cloudflare for JavaScript to render content
      logger.info('Waiting 15 seconds for page JavaScript to render content...');
      await new Promise((resolve) => setTimeout(resolve, 15000));

      // Wait for the settlements container wrapper first
      try {
        await this.page.waitForSelector('.js-settlements-pane', {
          timeout: 15000,
        });
        logger.info('Settlements container found on page');
      } catch (error) {
        logger.warn('Settlements container selector timeout');
      }

      // Then wait for settlement cards to load
      try {
        await this.page.waitForSelector('.settlement-card', {
          timeout: 15000,
        });
        logger.info('Settlement cards found on page');
      } catch (error) {
        logger.warn('Settlement card selector timeout, trying to scrape anyway...');
      }

      // Scroll to load any lazy content
      await this.autoScroll(this.page);

      // Wait a bit more for content to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      const pageData = await this.page.evaluate(() => {
        const settlements: Array<{
          title: string;
          url: string;
          deadline: string | null;
          payout: string | null;
          description: string | null;
        }> = [];

        // Find all settlement cards - this is the correct structure for ClassAction.org
        // @ts-ignore - document is available in browser context
        const cards = document.querySelectorAll('.settlement-card');

        // @ts-ignore - Element is available in browser context
        cards.forEach((card: Element) => {
          try {
            // Get title and URL from the link inside h3
            // @ts-ignore
            const linkElement = card.querySelector('h3 a.js-settlement-link');
            if (!linkElement) return;

            const title = (linkElement.textContent || '').trim();
            const url = linkElement.getAttribute('href') || '';

            if (!title || !url) return;

            // Get deadline - look for the specific deadline span
            let deadline: string | null = null;
            // @ts-ignore
            const deadlineElements = card.querySelectorAll('span');
            for (const span of deadlineElements) {
              const text = (span.textContent || '').trim();
              // Look for date patterns like "2/5/26", "2/13/26", etc.
              if (text.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                deadline = text;
                break;
              }
            }

            // Get payout amount - look for the green payout span
            let payout: string | null = null;
            // @ts-ignore
            const payoutElement = card.querySelector('span.green');
            if (payoutElement) {
              payout = (payoutElement.textContent || '').trim();
            }

            // Get description - look for the specific paragraph
            let description: string | null = null;
            // @ts-ignore
            const descElement = card.querySelector('p.f6.lh-copy');
            if (descElement) {
              description = (descElement.textContent || '').trim();
            }

            settlements.push({
              title,
              url,
              deadline,
              payout,
              description,
            });
          } catch (error) {
            console.error('Error parsing settlement card:', error);
          }
        });

        return settlements;
      });

      logger.info(`Found ${pageData.length} settlements on ClassAction.org`);

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

          // Create description from available info
          let description = data.description || '';
          if (data.payout && !description.includes(data.payout)) {
            description = `${data.payout}. ${description}`.trim();
          }

          cases.push({
            brand,
            caseTitle: data.title,
            sourceUrl: fullUrl,
            deadline,
            description: description || undefined,
          });

          logger.debug(`Scraped from ClassAction.org: ${data.title}`);
        } catch (error) {
          logger.error('Error processing ClassAction.org item:', error);
        }
      }

      logger.info(`ClassAction.org: Total cases found: ${cases.length}`);
    } catch (error) {
      logger.error('Error scraping ClassAction.org:', error);
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
