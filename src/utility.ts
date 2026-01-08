import { Marked } from 'marked';
import TurndownService, { type Rule, type TagName } from 'turndown';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';

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

export const convertToMarkDown = (input: string, hostname: string): string => {
  tdService.addRule('table', tableRule);

  tdService.addRule('images', {
    filter: 'img',
    replacement: function (content, node) {
      const imgNode = node as HTMLImageElement;
      const alt = imgNode.alt || '';
      let src = imgNode.getAttribute('src') || '';
      const title = imgNode.title || '';

      // Convert relative URLs to absolute
      if (src && !src.match(/^https?:\/\//)) {
        // Handle protocol-relative URLs
        if (src.startsWith('//')) {
          src = 'https:' + src;
        }
        // Handle paths starting with /
        else if (src.startsWith('/')) {
          src = hostname + src;
        }
        // Handle relative paths
        else {
          src = hostname + '/' + src;
        }
      }

      const titlePart = title ? ' "' + title + '"' : '';
      return src ? '![' + alt + '](' + src + titlePart + ')' : '';
    },
  });

  if (input) {
    return tdService.turndown(input);
  }
  return input;
};

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

export const markdownToHtml = (input: string): string => {
  return marked.parse(input, {
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

export const warn = (msg: string) => {
  console.log(`⚠️ ${msg}`);
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
    return await toRun;
  } finally {
    clearInterval(timer);
    process.stdout.write('\r'); // Clear the loading line
  }
};
