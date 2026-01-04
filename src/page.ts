import puppeteer, { Browser, Page } from 'puppeteer';
import { ok, runLoading } from './utility';

// Helper function to add random delay (mimics human behavior)
const randomDelay = (min: number = 1000, max: number = 3000): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export interface ScraperConfig {
  headless?: boolean;
  userAgent?: string;
  viewport?: { width: number; height: number };
  timeout?: number;
}

export class Scraper {
  private browser: Browser | null = null;
  private config: ScraperConfig;

  constructor(config: ScraperConfig = {}) {
    this.config = {
      headless: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      timeout: 30000,
      ...config,
    };
  }

  isInitialized(): boolean {
    return this.browser !== null;
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=en-US,en;q=0.9',
      ],
      defaultViewport: this.config.viewport,
    });
  }

  async printPdf(htmlContent: string, documentPath: string) {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();
    // we are setting the page content, wait for all the images to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: documentPath,
      format: 'A4',
      printBackground: true,
      margin: {
        // Define margins
        // TODO: accept from input
        top: '50px',
        right: '50px',
        bottom: '50px',
        left: '50px',
      },
    });
  }

  async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();

    // Set user agent
    const client = await page.createCDPSession();
    await client.send('Network.setUserAgentOverride', {
      userAgent: this.config.userAgent!,
      acceptLanguage: 'en-US,en;q=0.9',
      platform: 'Win32',
    });

    // Set realistic viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    });

    // Remove webdriver flag and other automation indicators
    await page.evaluateOnNewDocument(() => {
      // Overwrite the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Overwrite chrome property
      (window as any).chrome = {
        runtime: {},
      };

      // Overwrite permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({
              state: Notification.permission,
            } as PermissionStatus)
          : originalQuery(parameters);

      // Overwrite plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Overwrite languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override plugins to make it look real
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: 'application/x-google-chrome-pdf',
              suffixes: 'pdf',
              description: 'Portable Document Format',
            },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin',
          },
        ],
      });
    });

    // Set timeout
    page.setDefaultNavigationTimeout(this.config.timeout!);
    page.setDefaultTimeout(this.config.timeout!);

    await this.addRandomMouseMovements(page);

    return page;
  }

  private async addRandomMouseMovements(page: Page): Promise<void> {
    // Add subtle random mouse movements
    await page.evaluateOnNewDocument(() => {
      let mouseX = 0;
      let mouseY = 0;

      const updateMousePosition = () => {
        mouseX += (Math.random() - 0.5) * 10;
        mouseY += (Math.random() - 0.5) * 10;
        mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
        mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
      };

      setInterval(updateMousePosition, 100);
    });
  }

  async scrapePage(
    url: string,
    options: {
      waitForSelector?: string;
      screenshot?: boolean;
      humanBehavior?: boolean;
    } = {}
  ): Promise<string> {
    const page = await runLoading(this.createPage());

    const start = Date.now();
    ok(`Starting Page fetch`);

    try {
      // Navigate with realistic options
      await runLoading(
        page.goto(url, {
          waitUntil: 'networkidle2', // Wait for network to be idle
          timeout: this.config.timeout,
        })
      );

      ok(`Network idle completed`);

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: this.config.timeout,
        });
      }

      // Add human-like behavior
      if (options.humanBehavior !== false) {
        await runLoading(randomDelay(500, 1500));
        ok(`Random delay 1 completed`);

        // Random mouse movements
        await runLoading(
          page.mouse.move(
            Math.floor(Math.random() * 1000),
            Math.floor(Math.random() * 800)
          )
        );
        ok(`Random Mouse Move Completed`);

        await runLoading(randomDelay(300, 800));
        ok(`Random delay 2 completed`);

        // Scroll like a human
        await runLoading(this.randomScroll(page));
        ok(`random scrolling completed`);

        await runLoading(randomDelay(500, 1000));
        ok(`Final random delay completed`);
      }

      // Get page content
      const html = await page.content();
      ok(`Got page content`);

      if (options.screenshot) {
        await page.screenshot({
          path: 'screen-better.png',
          fullPage: true,
        });
      }
      ok(`screenshot completed as well`);

      await page.close();
      const end = Date.now();

      console.log(`📋 page data fetched in`, end - start, `milliseconds`);

      return html;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  private async randomScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const distance = Math.floor(Math.random() * 500) + 100;
      const delay = Math.floor(Math.random() * 100) + 50;

      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, distance / 10);
          totalHeight += distance / 10;

          if (totalHeight >= distance) {
            clearInterval(timer);
            resolve();
          }
        }, delay);
      });
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
