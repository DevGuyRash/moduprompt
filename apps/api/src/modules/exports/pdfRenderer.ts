import { createHash } from 'node:crypto';
import type { PdfRenderer, PdfRendererOptions } from '@moduprompt/compiler';
import type { Env } from '../../config/env.js';
import pino from 'pino';
import puppeteer from 'puppeteer-core';

class PuppeteerPdfRenderer implements PdfRenderer {
  private readonly logger = pino({ name: 'export-pdf-renderer' });

  constructor(private readonly executablePath?: string) {}

  async render(html: string, options: PdfRendererOptions): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: this.executablePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'],
    });
    const abortHandler = () => {
      this.logger.warn('PDF render aborted; closing browser');
      void browser.close();
    };
    if (options.signal) {
      if (options.signal.aborted) {
        await browser.close();
        throw new Error('PDF render aborted before start');
      }
      options.signal.addEventListener('abort', abortHandler, { once: true });
    }
    try {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: options.timeoutMs });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: options.pdf?.headerFooter ?? false,
        margin: { top: options.pdf?.margin ?? '0.75in', right: '0.75in', bottom: options.pdf?.margin ?? '0.75in', left: '0.75in' },
      });
      await page.close({ runBeforeUnload: false });
      return pdf;
    } finally {
      await browser.close();
      if (options.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }
    }
  }
}

class StubPdfRenderer implements PdfRenderer {
  async render(html: string): Promise<Buffer> {
    const hash = createHash('sha256').update(html).digest('hex');
    const payload = `ModuPrompt PDF stub\nHash: ${hash}\nLength: ${html.length}`;
    return Buffer.from(payload, 'utf8');
  }
}

export const createPdfRenderer = (env: Env): PdfRenderer | undefined => {
  if (env.EXPORT_PDF_RENDERER === 'stub') {
    return new StubPdfRenderer();
  }
  try {
    return new PuppeteerPdfRenderer(env.PUPPETEER_EXECUTABLE_PATH);
  } catch (error) {
    const logger = pino({ name: 'export-pdf-renderer' });
    logger.error({ err: error }, 'failed to initialize puppeteer renderer; falling back to stub');
    return new StubPdfRenderer();
  }
};
