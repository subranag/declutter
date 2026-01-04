import type { LanguageModel } from 'ai';
import * as fs from 'fs';
import path from 'path';
import type { AllowedFormats } from './app';
import { declutterToMarkdown } from './llm';
import { styledHtml, type StyleName } from './outputs';
import { Scraper } from './page';
import { convertToMarkDown, markdownToHtml, ok, runLoading } from './utility';

export interface DeclutterInput {
  readonly url: URL;
  readonly model: LanguageModel;
  readonly maxTokens: number;
  readonly outputFormat: AllowedFormats;
  readonly outputDirectory: string;
  readonly styleName: StyleName;
}

let scraper: Scraper = new Scraper({
  headless: true,
  timeout: 30000,
});

export async function declutterUrl({
  url,
  model,
  maxTokens,
  outputFormat,
  outputDirectory,
  styleName,
}: DeclutterInput) {
  try {
    if (!scraper.isInitialized()) {
      await scraper.initialize();
    }

    const html = await scraper.scrapePage(url.href, {
      humanBehavior: true,
    });

    const tempMarkdown = convertToMarkDown(html);

    console.log(`🪄 Starting declutter`);
    const declutteredMarkdown = await runLoading(
      declutterToMarkdown(tempMarkdown, model, maxTokens),
      'Decluttering content...'
    );
    console.log(`✨ Decluttering Complete`);

    const fileNamePrefix =
      url.pathname && url.pathname === '/'
        ? url.hostname.replaceAll('.', '-')
        : url.pathname.replaceAll('/', '-').replace('-', ''); // the first slash should bre replaced by empty
    const filePath = `${outputDirectory}${path.sep}${fileNamePrefix}`;

    switch (outputFormat) {
      case 'md':
        const markdownPath = `${filePath}.md`;
        fs.writeFileSync(
          markdownPath,
          declutteredMarkdown ? declutteredMarkdown : '',
          {
            encoding: 'utf-8',
          }
        );
        ok(`written output to ${markdownPath}`);
        break;
      case 'html':
        const finalHtml = styledHtml(
          markdownToHtml(declutteredMarkdown!),
          styleName
        );
        const htmlPath = `${filePath}.html`;
        fs.writeFileSync(htmlPath, finalHtml, {
          encoding: 'utf-8',
        });
        ok(`written output to ${htmlPath}`);
        break;
      case 'pdf':
        const finalHtmlPdf = styledHtml(
          markdownToHtml(declutteredMarkdown!),
          styleName
        );
        const pdfPath = `${filePath}.pdf`;
        await runLoading(
          scraper.printPdf(finalHtmlPdf, pdfPath),
          'Generating PDF...'
        );
        ok(`written output to ${pdfPath}`);
        break;
      default:
        throw new Error(
          `unknown format: ${outputFormat} cannot generate output`
        );
    }
  } finally {
    await scraper.close();
  }
}
