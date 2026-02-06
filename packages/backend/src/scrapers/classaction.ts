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
      // Add stealth plugin to avoid detection
      puppeteer.use(StealthPlugin());

      this.browser = await puppeteer.launch({
        headless: true, // Must be true in Docker (no display)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-breakpad',
          '--disable-canvas-aa',
          '--disable-2d-canvas-clip-aa',
          '--disable-gl-drawing-for-tests',
          '--enable-webgl',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-first-run',
          '--no-zygote',
          '--use-gl=swiftshader',
          '--deterministic-fetch',
        ],
        timeout: 60000,
      });

      if (!this.browser) {
        throw new Error('Failed to launch browser');
      }

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Set realistic user agent and headers
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Set extra headers to appear more like a real browser
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

      // Step 1: Wait for Cloudflare challenge config to be injected
      logger.info('Waiting for Cloudflare challenge configuration to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract Cloudflare challenge parameters (for Challenge pages)
      const challengeParams = await page.evaluate(() => {
        // @ts-ignore
        const cfOpt = window._cf_chl_opt;
        if (!cfOpt) {
          console.log('window._cf_chl_opt not found!');
          return null;
        }

        console.log('Found window._cf_chl_opt:', Object.keys(cfOpt));

        // According to 2Captcha docs for Cloudflare Challenge pages:
        // - action = cfOpt.cType (e.g., "interactive", "managed")
        // - data (cData) = cfOpt.md
        // - pagedata (chlPageData) = cfOpt.mdrd
        return {
          action: cfOpt.cType,
          cData: cfOpt.md,
          chlPageData: cfOpt.mdrd,
          cRay: cfOpt.cRay,
          cZone: cfOpt.cZone,
        };
      });

      logger.info(`Challenge params found: ${JSON.stringify({
        hasCData: !!challengeParams?.cData,
        hasChlPageData: !!challengeParams?.chlPageData,
        action: challengeParams?.action
      })}`);

      // Step 2: Extract sitekey from the page
      let sitekey = await this.extractTurnstileSitekey(page);

      if (!sitekey) {
        logger.error('Could not extract Turnstile sitekey from page');

        // Debug: Get more info about what's on the page
        const debugInfo = await page.evaluate(() => {
          return {
            // @ts-ignore
            hasTurnstileInput: !!document.querySelector('[name="cf-turnstile-response"]'),
            // @ts-ignore
            hasIframes: document.querySelectorAll('iframe').length,
            // @ts-ignore
            iframeSrcs: Array.from(document.querySelectorAll('iframe')).map(f => f.src).slice(0, 3).join(', '),
            // @ts-ignore
            scriptCount: document.querySelectorAll('script').length,
            // @ts-ignore
            hasWindowTurnstile: typeof window.turnstile !== 'undefined',
          };
        });

        logger.info(`Turnstile debug: ${JSON.stringify(debugInfo)}`);

        // Wait for the Cloudflare challenge platform to fully load
        logger.info('Waiting for Cloudflare challenge platform to render Turnstile widget...');

        try {
          // Wait for either an iframe OR for the page title to change (indicating the challenge loaded)
          await Promise.race([
            page.waitForSelector('iframe[src*="challenges.cloudflare.com"]', { timeout: 20000 }),
            // @ts-ignore
            page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 20000 })
          ]);

          logger.info('Turnstile widget loaded or page changed');
          await new Promise(resolve => setTimeout(resolve, 3000)); // Give it a moment to stabilize
        } catch (err) {
          logger.warn(`Timeout waiting for Turnstile widget: ${err}`);
        }

        // Check again
        const debugInfo2 = await page.evaluate(() => {
          return {
            // @ts-ignore
            title: document.title,
            // @ts-ignore
            hasIframes: document.querySelectorAll('iframe').length,
            // @ts-ignore
            iframeSrcs: Array.from(document.querySelectorAll('iframe')).map(f => f.src).slice(0, 3),
          };
        });
        logger.info(`After waiting for widget: ${JSON.stringify(debugInfo2)}`);

        // Take screenshot to see what's displayed
        try {
          await page.screenshot({
            path: '/app/cloudflare-debug.png',
            fullPage: true
          });
          logger.info('📸 Screenshot saved to /app/cloudflare-debug.png');
          logger.info('   You can copy it with: docker cp claims-intake-backend:/app/cloudflare-debug.png ./');
        } catch (err) {
          logger.warn(`Could not save screenshot: ${err}`);
        }

        // Save full HTML for inspection
        try {
          const fs = require('fs');
          const fullHTML = await page.content();
          fs.writeFileSync('/app/cloudflare-debug.html', fullHTML);
          logger.info('📄 Full page HTML saved to /app/cloudflare-debug.html');
          logger.info('   You can copy it with: docker cp claims-intake-backend:/app/cloudflare-debug.html ./');
        } catch (err) {
          logger.warn(`Could not save HTML: ${err}`);
        }

        // Try extracting sitekey again
        sitekey = await this.extractTurnstileSitekey(page);

        if (!sitekey) {
          logger.error('Still could not find sitekey after waiting');
          return false;
        }

        logger.info(`Found sitekey after retry: ${sitekey.substring(0, 10)}...`);
      } else {
        logger.info(`Found sitekey: ${sitekey.substring(0, 10)}...`);
      }

      // Step 2: Send CAPTCHA to 2Captcha using createTask API
      const axios = require('axios');
      logger.info('Sending Cloudflare Challenge to 2Captcha API v2...');

      // Build task object according to 2Captcha docs
      const taskPayload: any = {
        clientKey: apiKey,
        task: {
          type: 'TurnstileTaskProxyless',
          websiteURL: pageUrl,
          websiteKey: sitekey,
        }
      };

      // Try to add challenge page parameters if available
      // If not available, 2Captcha will try to solve it as a standalone captcha
      if (challengeParams) {
        if (challengeParams.cData) {
          taskPayload.task.data = challengeParams.cData;
          logger.info('✓ Added cData to task');
        }
        if (challengeParams.chlPageData) {
          taskPayload.task.pagedata = challengeParams.chlPageData;
          logger.info('✓ Added pagedata to task');
        }
        if (challengeParams.action) {
          taskPayload.task.action = challengeParams.action;
          logger.info('✓ Added action to task');
        }
      } else {
        logger.info('No challenge params found - attempting as standalone Turnstile captcha');
      }

      logger.info(`Task payload: ${JSON.stringify({
        ...taskPayload,
        clientKey: '***',
        task: {
          ...taskPayload.task,
          data: taskPayload.task.data ? '(present)' : '(missing)',
          pagedata: taskPayload.task.pagedata ? '(present)' : '(missing)',
        }
      })}`);

      const submitResponse = await axios.post('https://api.2captcha.com/createTask', taskPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Check if task was created successfully
      if (submitResponse.data.errorId !== 0) {
        logger.error(`2Captcha task creation failed: ${JSON.stringify(submitResponse.data)}`);
        return false;
      }

      const taskId = submitResponse.data.taskId;
      logger.info(`✅ Task created! Task ID: ${taskId}`);

      // Step 3: Poll for solution using getTaskResult
      logger.info('Waiting for 2Captcha to solve (Cloudflare Turnstile usually takes 10-30 seconds)...');
      let solution = null;
      let userAgent = null;
      const maxAttempts = 60; // 60 * 5s = 5 minutes max

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultResponse = await axios.post('https://api.2captcha.com/getTaskResult', {
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
          userAgent = resultResponse.data.solution.userAgent;
          logger.info('✅ CAPTCHA solved by 2Captcha!');
          logger.info(`Token: ${solution.substring(0, 20)}...`);
          if (userAgent) {
            logger.info(`UserAgent returned: ${userAgent.substring(0, 50)}...`);
          }
          break;
        } else if (resultResponse.data.status === 'processing') {
          if (attempt % 4 === 0) {
            logger.info(`Still processing... (${(attempt + 1) * 5}s elapsed)`);
          }
        } else {
          logger.warn(`Unexpected status: ${resultResponse.data.status}`);
        }
      }

      if (!solution) {
        logger.error('Timeout waiting for 2Captcha solution (5 minutes)');
        return false;
      }

      // Step 4: Inject solution into Cloudflare Challenge page
      logger.info('Injecting CAPTCHA solution into Cloudflare Challenge page...');

      const injected = await page.evaluate((token) => {
        try {
          // Method 1: Set the hidden input value (for standalone captchas)
          // @ts-ignore
          const responseInput = document.querySelector('[name="cf-turnstile-response"]');
          if (responseInput) {
            // @ts-ignore
            responseInput.value = token;
            console.log('Token injected into cf-turnstile-response');
          }

          // Method 2: Set g-recaptcha-response for compatibility mode
          // @ts-ignore
          const grecaptchaInput = document.querySelector('[name="g-recaptcha-response"]');
          if (grecaptchaInput) {
            // @ts-ignore
            grecaptchaInput.value = token;
            console.log('Token injected into g-recaptcha-response');
          }

          // Method 3: Try to call the callback function (for Challenge pages)
          // @ts-ignore
          if (window.tsCallback && typeof window.tsCallback === 'function') {
            // @ts-ignore
            window.tsCallback(token);
            console.log('Token passed to tsCallback');
            return 'callback';
          }

          // Method 4: Look for Cloudflare form and submit it
          // @ts-ignore
          const form = document.querySelector('form[action*="__cf_chl"]');
          if (form && responseInput) {
            console.log('Found Cloudflare challenge form, submitting...');
            // @ts-ignore
            form.submit();
            return 'form_submit';
          }

          return 'inputs_set';
        } catch (err: any) {
          console.error('Error injecting token:', err);
          return 'error: ' + (err?.message || 'unknown');
        }
      }, solution);

      logger.info(`Token injection result: ${injected}`);

      // Wait for page to process and navigate
      logger.info('Waiting for Cloudflare to process solution and navigate...');
      try {
        // Wait for navigation (Cloudflare should redirect after successful verification)
        await page.waitForNavigation({ timeout: 15000, waitUntil: 'networkidle0' });
        logger.info('✅ Page navigated after CAPTCHA solution!');
      } catch (err: any) {
        logger.warn(`No navigation detected (${err?.message}), checking if page content loaded...`);
        // Even without navigation, the page might have loaded the content
      }

      return true;
    } catch (error) {
      logger.error('Error solving Turnstile CAPTCHA:', error);
      return false;
    }
  }

  private async extractTurnstileSitekey(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      // Method 1: Look for data-sitekey attribute on any element
      // @ts-ignore
      const turnstileDiv = document.querySelector('[data-sitekey]');
      if (turnstileDiv) {
        // @ts-ignore
        return turnstileDiv.getAttribute('data-sitekey');
      }

      // Method 2: Look in window.turnstile configuration
      // @ts-ignore
      if (window.turnstile && window.turnstile._impl && window.turnstile._impl.sitekey) {
        // @ts-ignore
        return window.turnstile._impl.sitekey;
      }

      // Method 3: Look for Cloudflare challenge config
      // @ts-ignore
      if (window._cf_chl_opt) {
        // @ts-ignore
        const config = window._cf_chl_opt;
        // Sometimes the sitekey is in the challenge config
        if (config.sitekey) return config.sitekey;
        // Or it might be the cRay (Ray ID) for Cloudflare Turnstile
        if (config.cRay) {
          // For Cloudflare managed challenges, we can sometimes use the Ray ID
          // but this is not a traditional sitekey
        }
      }

      // Method 4: Look for iframe src with sitekey
      // @ts-ignore
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        // @ts-ignore
        const src = iframe.src || '';
        if (src.includes('challenges.cloudflare.com') || src.includes('turnstile')) {
          const match = src.match(/[?&]sitekey=([^&]+)/);
          if (match) return match[1];
          // Also try to extract from URL path (e.g., /v0/b/SITEKEY/api.js)
          const pathMatch = src.match(/\/b\/([a-zA-Z0-9_-]+)\//);
          if (pathMatch) return pathMatch[1];
        }
      }

      // Method 5: Look in scripts for sitekey
      // @ts-ignore
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        // @ts-ignore
        const src = script.src || '';
        if (src) {
          // Check for sitekey parameter
          const match = src.match(/[?&]sitekey=([^&]+)/);
          if (match) return match[1];
          // Check for Turnstile URL path pattern
          if (src.includes('turnstile') || src.includes('challenges.cloudflare.com')) {
            const pathMatch = src.match(/\/b\/([a-zA-Z0-9_-]+)\//);
            if (pathMatch) return pathMatch[1];
          }
        }

        // Look in script content
        // @ts-ignore
        const content = script.textContent || '';
        const patterns = [
          /sitekey['":\s=]+['"]([0-9a-zA-Z_-]{10,})['"]/,
          /['"]sitekey['"]:\s*['"]([0-9a-zA-Z_-]{10,})['"]/,
          /data-sitekey=['"]([0-9a-zA-Z_-]{10,})['"]/,
          /turnstile\.render\([^,]+,\s*{[^}]*sitekey:\s*['"]([0-9a-zA-Z_-]{10,})['"]/,
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) return match[1];
        }
      }

      return null;
    });
  }

  private async waitForCloudflare(page: Page): Promise<void> {
    logger.info('Checking for Cloudflare challenge...');

    try {
      // Wait a bit for the page to potentially show Cloudflare
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check if Cloudflare challenge is present
      const hasCloudflare = await page.evaluate(() => {
        // @ts-ignore - document is available in browser context
        const text = document.body.innerText || '';
        return text.includes('Verifying you are human') ||
          text.includes('Checking your browser') ||
          text.includes('Just a moment') ||
          text.includes('Verify you are human') || // Interactive challenge
          text.includes('Complete the action below') ||
          // @ts-ignore - document is available in browser context
          document.title.includes('Just a moment') ||
          // @ts-ignore - check for Turnstile widget
          document.querySelector('[name="cf-turnstile-response"]') !== null;
      });

      if (hasCloudflare) {
        const challengeType = await page.evaluate(() => {
          // @ts-ignore
          const text = document.body.innerText || '';
          if (text.includes('Verify you are human') || text.includes('Complete the action below')) {
            return 'interactive';
          }
          return 'automatic';
        });

        logger.warn(`Cloudflare ${challengeType} challenge detected. Waiting for it to complete...`);

        // Wait up to 90 seconds for Cloudflare to complete (increased for interactive challenges)
        let attempts = 0;
        const maxAttempts = 90;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const stillHasCloudflare = await page.evaluate(() => {
            // @ts-ignore - document is available in browser context
            const text = document.body.innerText || '';
            const hasChallenge = text.includes('Verifying you are human') ||
              text.includes('Checking your browser') ||
              text.includes('Just a moment') ||
              text.includes('Verify you are human') || // Interactive
              text.includes('Complete the action below') ||
              // @ts-ignore - document is available in browser context
              document.title.includes('Just a moment') ||
              // @ts-ignore - check for Turnstile widget
              document.querySelector('[name="cf-turnstile-response"]') !== null;

            // Also check if real content is loaded
            // @ts-ignore - document is available in browser context
            const hasContent = document.querySelector('.settlement-card, .js-settlements-pane');

            return hasChallenge && !hasContent;
          });

          if (!stillHasCloudflare) {
            const currentUrl = page.url();
            logger.info(`Cloudflare challenge passed! Page content detected. Current URL: ${currentUrl}`);
            // Wait much longer for JavaScript to fully render page content
            logger.info('Waiting 30 seconds for page content to fully render...');
            await new Promise((resolve) => setTimeout(resolve, 30000));
            return;
          }

          attempts++;

          // Log progress every 10 seconds
          if (attempts % 10 === 0) {
            logger.info(`Still waiting for Cloudflare... (${attempts}s elapsed)`);
          }
        }

        logger.warn('Cloudflare challenge may still be present after waiting 90 seconds');

        // Check if we're still on a Cloudflare challenge page
        const stillBlocked = await page.evaluate(() => {
          // @ts-ignore
          const text = document.body.innerText || '';
          return text.includes('Verify you are human') ||
            text.includes('Verifying you are human') ||
            // @ts-ignore
            document.querySelector('[name="cf-turnstile-response"]') !== null;
        });

        if (stillBlocked) {
          logger.warn('Still appears to be blocked by Cloudflare after 90 seconds.');
          logger.info('Attempting to solve with 2Captcha API...');

          const solved = await this.solveTurnstileCaptcha(page);

          if (!solved) {
            logger.warn('2Captcha could not solve the challenge. Skipping this scrape.');
            return; // Exit gracefully
          }

          logger.info('✅ CAPTCHA solved! Continuing with scrape...');
          // Continue to scraping after successful solution
        }
      } else {
        logger.info('No Cloudflare challenge detected');
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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Debug: Check what's on the page
      const debugInfo = await this.page.evaluate(() => {
        // @ts-ignore - document is available in browser context
        const wrapper = document.querySelector('.js-settlements-pane');
        // @ts-ignore
        const cards = document.querySelectorAll('.settlement-card');
        // @ts-ignore
        const allDivs = document.querySelectorAll('div[class*="settlement"]');
        // @ts-ignore
        const bodyClasses = document.body.className;
        // @ts-ignore
        const htmlSample = document.body.innerHTML.substring(0, 1500);

        return {
          hasWrapper: !!wrapper,
          cardCount: cards.length,
          divsWithSettlement: allDivs.length,
          bodyClasses: bodyClasses,
          // @ts-ignore
          bodyText: document.body.innerText.substring(0, 800),
          htmlSample: htmlSample,
        };
      });
      logger.info(`Page debug - Wrapper exists: ${debugInfo.hasWrapper}, Cards found: ${debugInfo.cardCount}, Divs with 'settlement': ${debugInfo.divsWithSettlement}`);
      logger.info(`Body classes: ${debugInfo.bodyClasses}`);
      logger.warn(`Page text sample: ${debugInfo.bodyText}`);
      logger.warn(`HTML sample: ${debugInfo.htmlSample}`);

      // Extract settlement data
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
