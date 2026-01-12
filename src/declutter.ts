import type { LanguageModel } from 'ai';
import { declutterToMarkdown } from './llm';
import { writeOutput, type AllowedFormats, type StyleName } from './outputs';
import { Scraper } from './page';
import { convertToMarkDown, runLoading } from './utility';

export interface DeclutterInput {
  readonly url: URL;
  readonly model: LanguageModel;
  readonly maxTokens: number;
  readonly outputFormat: AllowedFormats;
  readonly outputDirectory: string;
  readonly styleName: StyleName;
  readonly browserPath?: string;
}

let scraper: Scraper = new Scraper({
  headless: true,
  timeout: 30000,
});

export async function declutterUrl(declutterInput: DeclutterInput) {
  const { url, model, maxTokens, browserPath } = declutterInput;
  try {
    if (!scraper.isInitialized()) {
      await scraper.initialize(browserPath);
    }

    const html = await scraper.scrapePage(url.href, {
      humanBehavior: true,
    });

    const tempMarkdown = convertToMarkDown(html, url.hostname);

    console.log(`🪄 Starting declutter`);
    const {
      markdown: decluttered,
      inputTokens,
      outputTokens,
      totalTokens,
    } = await runLoading(
      declutterToMarkdown(tempMarkdown, model, maxTokens),
      'Decluttering content...'
    );
    console.log(`✨ Decluttering Complete`);

    const metadataTable = objectToMarkdownTable({
      url: url.href,
      time: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      inputTokens,
      outputTokens,
      totalTokens,
    });

    const declutteredMarkdown = decluttered
      ? decluttered + metadataTable
      : metadataTable;
    await writeOutput({
      ...declutterInput,
      scraper,
      declutteredMarkdown,
    });
  } finally {
    await scraper.close();
  }
}

function objectToMarkdownTable<T extends Record<string, any>>(
  obj: T,
  fieldLabels?: Partial<Record<keyof T, string>>
): string {
  // Helper function to convert camelCase to Title Case
  function camelToTitleCase(str: string): string {
    // Insert space before uppercase letters and capitalize first letter
    const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  const allRows = [`| Metadata | Value |\n|-------|-------|`];

  // Build table rows
  const rows = Object.entries(obj).map(([key, value]) => {
    const label = fieldLabels?.[key as keyof T] ?? camelToTitleCase(key);
    const displayValue =
      value === null || value === undefined ? '' : String(value);
    return `| ${label} | ${displayValue} |`;
  });
  allRows.push(...rows);

  return `\n\n ${allRows.join('\n')}`;
}
