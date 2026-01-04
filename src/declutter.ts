import type { LanguageModel } from 'ai';
import * as fs from 'fs';
import path from 'path';
import { declutterToMarkdown } from './llm';
import {
  styledHtml,
  writeOutput,
  type AllowedFormats,
  type StyleName,
} from './outputs';
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

export async function declutterUrl(declutterInput: DeclutterInput) {
  const { url, model, maxTokens } = declutterInput;
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

    await writeOutput({ ...declutterInput, scraper, declutteredMarkdown });
  } finally {
    await scraper.close();
  }
}
