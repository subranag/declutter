import { marked } from 'marked';
import TurndownService, { type Rule, type TagName } from 'turndown';

const tdService = new TurndownService();
const unwantedTags: TagName[] = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
];
tdService.remove(unwantedTags);

const tableRule: Rule = {
  filter: 'table',
  replacement: function (content, node) {
    let markdown = '';
    const rows = Array.from(node.querySelectorAll('tr'));

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      const rowContent = Array.from(cells)
        .map((cell) => cell.textContent.trim())
        .join(' | ');

      markdown += '| ' + rowContent + ' |\n';

      // Add separator after header row
      if (rowIndex === 0) {
        const separators = Array.from(cells)
          .map(() => '---')
          .join(' | ');
        markdown += '| ' + separators + ' |\n';
      }
    });

    return markdown;
  },
};

export const convertToMarkDown = (input: string): string => {
  tdService.addRule('table', tableRule);
  if (input) {
    return tdService.turndown(input);
  }
  return input;
};

export const markdownToHtml = (input: string): string => {
  return marked(input, {
    breaks: true,
    gfm: true,
  }) as string;
};

export class StringBuilder {
  constructor(private parts: string[] = []) {}

  add(...inputParts: string[]) {
    if (inputParts && inputParts.length > 0) {
      this.parts.push(...inputParts);
    }
  }

  stringify(): string | undefined {
    if (this.parts.length > 0) {
      return this.parts.join('');
    }
  }
}

export const ok = (msg: string) => {
  console.log(`✅ ${msg}`);
};

export function* loading(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  while (true) {
    process.stdout.write(`\r${frames[i]} ${message}`);
    i = (i + 1) % frames.length;
    yield;
  }
}

export const runLoading = async <T>(
  toRun: Promise<T>,
  message: string = 'Processing...',
  interval: number = 50
): Promise<T> => {
  const loader = loading(message);
  const timer = setInterval(() => {
    loader.next();
  }, interval);
  try {
    const retVal = await toRun;
    return retVal;
  } finally {
    clearInterval(timer);
    process.stdout.write('\r'); // Clear the loading line
  }
};
