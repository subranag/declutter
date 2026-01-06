import * as fs from 'fs';
import path from 'path';
import type { DeclutterInput } from './declutter';
import { Scraper } from './page';
import { markdownToHtml, ok, runLoading } from './utility';

const HTML_DATA_PLACEHOLDER = '__HTML_DATA__';
const STYLE_DATA_PLACEHOLDER = '__STYLE_DATA__';

export type StyleName = keyof typeof stylesMap;
export const DEFAULT_STYLE: StyleName = 'MINIMALIST_SWISS';

export const PDF_OUTPUT_FORMAT = 'pdf' as const;
export const MARKDOWN_OUTPUT_FORMAT = 'md' as const;
export const HTML_OUTPUT_FORMAT = 'html' as const;
export const allowedFormats = [
  MARKDOWN_OUTPUT_FORMAT,
  PDF_OUTPUT_FORMAT,
  HTML_OUTPUT_FORMAT,
] as const;
export type AllowedFormats = (typeof allowedFormats)[number];
const DECLUTTERED_DIRECTORY = 'Decluttered';

export type AllowedConvertToFormats = Exclude<
  AllowedFormats,
  typeof MARKDOWN_OUTPUT_FORMAT
>;

export const convertMarkdownTo = async ({
  markdownFilePath,
  outputFormat,
  styleName,
}: {
  readonly markdownFilePath: string;
  readonly outputFormat: AllowedConvertToFormats;
  readonly styleName: StyleName;
}) => {
  if (!markdownFilePath.endsWith(`.${MARKDOWN_OUTPUT_FORMAT}`)) {
    throw new Error(
      `invalid markdown file extension, must end with .${MARKDOWN_OUTPUT_FORMAT}`
    );
  }

  if (!fs.existsSync(markdownFilePath)) {
    throw new Error(`markdown file does not exist: ${markdownFilePath}`);
  }

  const markdownContent = fs.readFileSync(markdownFilePath, {
    encoding: 'utf-8',
  });

  switch (outputFormat) {
    case HTML_OUTPUT_FORMAT: {
      const finalHtml = styledHtml(markdownToHtml(markdownContent), styleName);
      const htmlPath = markdownFilePath.replace(
        /\.md$/i,
        `.${HTML_OUTPUT_FORMAT}`
      );
      fs.writeFileSync(htmlPath, finalHtml, {
        encoding: 'utf-8',
      });
      ok(`written output to ${htmlPath}`);
      break;
    }
    case PDF_OUTPUT_FORMAT: {
      const finalHtml = styledHtml(
        markdownToHtml(markdownContent),
        DEFAULT_STYLE
      );
      const pdfPath = markdownFilePath.replace(
        /\.md$/i,
        `.${PDF_OUTPUT_FORMAT}`
      );

      let scraper: Scraper = new Scraper({
        headless: true,
        timeout: 30000,
      });

      try {
        if (!scraper.isInitialized()) {
          await scraper.initialize();
        }

        await runLoading(
          scraper.printPdf(finalHtml, pdfPath),
          'Generating PDF...'
        );

        ok(`written output to ${pdfPath}`);
      } finally {
        scraper.close();
      }
      break;
    }
    default:
      throw new Error(`unknown format: ${outputFormat} cannot generate output`);
  }
};

export const writeOutput = async ({
  scraper,
  url,
  declutteredMarkdown,
  outputFormat,
  styleName,
  outputDirectory,
}: DeclutterInput & {
  readonly scraper: Scraper;
  readonly declutteredMarkdown: string;
}): Promise<void> => {
  const { directory, fileNamePrefix } = pathFromUrl(url);

  const finalDirectory = `${outputDirectory}${path.sep}${DECLUTTERED_DIRECTORY}${path.sep}${directory}`;
  fs.mkdirSync(finalDirectory, { recursive: true });
  const finalPath = `${finalDirectory}${path.sep}${fileNamePrefix}`;

  switch (outputFormat) {
    case MARKDOWN_OUTPUT_FORMAT:
      const markdownPath = `${finalPath}.${MARKDOWN_OUTPUT_FORMAT}`;
      fs.writeFileSync(markdownPath, declutteredMarkdown, {
        encoding: 'utf-8',
      });
      ok(`written output to ${markdownPath}`);
      break;
    case HTML_OUTPUT_FORMAT:
      const finalHtml = styledHtml(
        markdownToHtml(declutteredMarkdown),
        styleName
      );
      const htmlPath = `${finalPath}.${HTML_OUTPUT_FORMAT}`;
      fs.writeFileSync(htmlPath, finalHtml, {
        encoding: 'utf-8',
      });
      ok(`written output to ${htmlPath}`);
      const markdownPathHtml = `${finalPath}.${MARKDOWN_OUTPUT_FORMAT}`;
      fs.writeFileSync(markdownPathHtml, declutteredMarkdown, {
        encoding: 'utf-8',
      });
      ok(`RAW markdown content written to ${markdownPathHtml}`);
      break;
    case PDF_OUTPUT_FORMAT:
      const finalHtmlPdf = styledHtml(
        markdownToHtml(declutteredMarkdown),
        styleName
      );
      const pdfPath = `${finalPath}.pdf`;
      await runLoading(
        scraper.printPdf(finalHtmlPdf, pdfPath),
        'Generating PDF...'
      );
      ok(`written output to ${pdfPath}`);
      const markdownPathPdf = `${finalPath}.md`;
      fs.writeFileSync(markdownPathPdf, declutteredMarkdown, {
        encoding: 'utf-8',
      });
      ok(`RAW markdown content written to ${markdownPathPdf}`);
      break;
    default:
      throw new Error(`unknown format: ${outputFormat} cannot generate output`);
  }
};

export const pathFromUrl = (
  url: URL
): {
  readonly directory: string;
  readonly fileNamePrefix: string;
} => {
  const directory = url.hostname.replaceAll('www.', '').replaceAll('.', '-');

  if (url.pathname === '/' || url.pathname === '') {
    return {
      directory,
      fileNamePrefix: 'index',
    };
  }

  const pathSegments = url.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '');

  if (pathSegments.length === 0) {
    return {
      directory,
      fileNamePrefix: 'index',
    };
  }

  return {
    directory,
    fileNamePrefix: pathSegments[pathSegments.length - 1]!,
  };
};

export const stylesMap = {
  MINIMALIST_SWISS: `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Helvetica Neue", "Arial", sans-serif;
  line-height: 1.6;
  color: #000;
  background-color: #fff;
  padding: 80px 100px;
  max-width: 1000px;
  margin: 0 auto;
}

h1 {
  font-size: 3.5em;
  font-weight: 300;
  color: #000;
  margin-bottom: 60px;
  letter-spacing: -2px;
  line-height: 1.1;
}

h2 {
  font-size: 2.2em;
  font-weight: 400;
  color: #000;
  margin-top: 80px;
  margin-bottom: 30px;
  letter-spacing: -1px;
}

h3 {
  font-size: 1.6em;
  font-weight: 500;
  color: #000;
  margin-top: 50px;
  margin-bottom: 20px;
}

h4 {
  font-size: 1.2em;
  font-weight: 600;
  color: #333;
  margin-top: 40px;
  margin-bottom: 15px;
}

h5 {
  font-size: 1em;
  font-weight: 600;
  color: #555;
  margin-top: 30px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

p {
  margin-bottom: 20px;
  text-align: left;
}

strong {
  font-weight: 700;
  color: #000;
}

em {
  font-style: italic;
}

a {
  color: #000;
  text-decoration: none;
  border-bottom: 2px solid #000;
  transition: opacity 0.2s ease;
}

a:hover {
  opacity: 0.5;
}

ul, ol {
  margin-left: 30px;
  margin-bottom: 25px;
}

li {
  margin-bottom: 10px;
  line-height: 1.6;
}

hr {
  border: none;
  border-top: 1px solid #000;
  margin: 80px 0;
}

img {
  max-width: 100%;
  height: auto;
  margin: 40px 0;
  display: block;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 50px 0;
}

thead {
  background-color: #000;
}

th {
  padding: 20px 15px;
  text-align: left;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
  font-size: 0.9em;
}

tr {
  border-bottom: 1px solid #e0e0e0;
}

tr:hover {
  background-color: #f5f5f5;
}

td {
  padding: 18px 15px;
  font-size: 0.95em;
}

tbody tr:last-child {
  border-bottom: none;
}
`,
  BRUTALIST_CONCRETE: `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Courier New", "Courier", monospace;
  line-height: 1.5;
  color: #1a1a1a;
  background-color: #e8e8e8;
  padding: 60px 80px;
  max-width: 950px;
  margin: 0 auto;
  border-left: 8px solid #1a1a1a;
  border-right: 8px solid #1a1a1a;
}

h1 {
  font-size: 3em;
  font-weight: 900;
  color: #000;
  margin-bottom: 30px;
  letter-spacing: -1px;
  text-transform: uppercase;
  background-color: #1a1a1a;
  color: #e8e8e8;
  padding: 30px;
  margin-left: -30px;
  margin-right: -30px;
}

h2 {
  font-size: 2em;
  font-weight: 900;
  color: #000;
  margin-top: 60px;
  margin-bottom: 25px;
  text-transform: uppercase;
  border-top: 4px solid #000;
  border-bottom: 4px solid #000;
  padding: 15px 0;
}

h3 {
  font-size: 1.4em;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 40px;
  margin-bottom: 20px;
  text-transform: uppercase;
}

h4 {
  font-size: 1.1em;
  font-weight: 700;
  color: #333;
  margin-top: 30px;
  margin-bottom: 15px;
  text-decoration: underline;
}

h5 {
  font-size: 1em;
  font-weight: 700;
  color: #444;
  margin-top: 25px;
  margin-bottom: 12px;
}

p {
  margin-bottom: 20px;
  text-align: left;
}

strong {
  font-weight: 900;
  background-color: #fff;
  padding: 2px 4px;
}

em {
  font-style: italic;
  text-decoration: underline;
}

a {
  color: #000;
  text-decoration: none;
  background-color: #fff;
  padding: 2px 6px;
  border: 2px solid #000;
  transition: all 0.2s ease;
}

a:hover {
  background-color: #000;
  color: #e8e8e8;
}

ul, ol {
  margin-left: 40px;
  margin-bottom: 25px;
}

li {
  margin-bottom: 12px;
  line-height: 1.5;
}

hr {
  border: none;
  border-top: 6px solid #000;
  margin: 60px 0;
}

img {
  max-width: 100%;
  height: auto;
  margin: 35px 0;
  display: block;
  border: 6px solid #000;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 40px 0;
  border: 4px solid #000;
}

thead {
  background-color: #000;
}

th {
  padding: 20px;
  text-align: left;
  font-weight: 900;
  color: #e8e8e8;
  text-transform: uppercase;
  font-size: 0.9em;
  border-right: 2px solid #e8e8e8;
}

th:last-child {
  border-right: none;
}

tr {
  border-bottom: 2px solid #000;
}

tr:hover {
  background-color: #fff;
}

td {
  padding: 18px 20px;
  font-size: 0.95em;
  border-right: 1px solid #ccc;
}

td:last-child {
  border-right: none;
}

tbody tr:last-child {
  border-bottom: none;
}
`,
  CLASSIC_BOOK: `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Baskerville", "Palatino", "Book Antiqua", serif;
  line-height: 1.9;
  color: #3e3e3e;
  background-color: #f7f3e9;
  padding: 80px 100px;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.15);
}

h1 {
  font-size: 2.8em;
  font-weight: 400;
  color: #2a2a2a;
  margin-bottom: 50px;
  letter-spacing: 2px;
  text-align: center;
  border-top: 2px solid #8b7355;
  border-bottom: 2px solid #8b7355;
  padding: 30px 0;
  font-variant: small-caps;
}

h2 {
  font-size: 1.9em;
  font-weight: 500;
  color: #3a3a3a;
  margin-top: 70px;
  margin-bottom: 30px;
  letter-spacing: 1px;
  text-align: center;
  font-variant: small-caps;
}

h3 {
  font-size: 1.5em;
  font-weight: 500;
  color: #4a4a4a;
  margin-top: 50px;
  margin-bottom: 25px;
  font-style: italic;
}

h4 {
  font-size: 1.2em;
  font-weight: 600;
  color: #5a5a5a;
  margin-top: 40px;
  margin-bottom: 20px;
}

h5 {
  font-size: 1.1em;
  font-weight: 600;
  color: #6a6a6a;
  margin-top: 35px;
  margin-bottom: 18px;
  font-style: italic;
}

p {
  margin-bottom: 24px;
  text-align: justify;
  text-indent: 2em;
}

strong {
  font-weight: 700;
  color: #2a2a2a;
}

em {
  font-style: italic;
}

a {
  color: #8b7355;
  text-decoration: none;
  border-bottom: 1px dotted #8b7355;
  transition: color 0.3s ease;
}

a:hover {
  color: #a68968;
}

ul, ol {
  margin-left: 50px;
  margin-bottom: 24px;
}

li {
  margin-bottom: 14px;
  line-height: 1.9;
}

hr {
  border: none;
  text-align: center;
  margin: 60px 0;
}

img {
  max-width: 100%;
  height: auto;
  margin: 40px auto;
  display: block;
  border: 1px solid #d4c5b0;
  padding: 15px;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 40px 0;
  background-color: #fff;
  border: 2px solid #d4c5b0;
}

thead {
  background-color: #e8dcc8;
}

th {
  padding: 18px;
  text-align: left;
  font-weight: 600;
  color: #3a3a3a;
  letter-spacing: 1px;
  font-size: 0.95em;
  border-bottom: 2px solid #d4c5b0;
}

tr {
  border-bottom: 1px solid #e8dcc8;
}

tr:hover {
  background-color: #faf8f3;
}

td {
  padding: 16px 18px;
  font-size: 0.95em;
  color: #3e3e3e;
}

tbody tr:last-child {
  border-bottom: none;
}  
`,
  TECH_TERMINAL: `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "SF Mono", "Consolas", "Monaco", monospace;
  line-height: 1.6;
  color: #00ff41;
  background-color: #0a0e27;
  padding: 50px 70px;
  max-width: 1000px;
  margin: 0 auto;
  border: 2px solid #00ff41;
}

h1 {
  font-size: 2.4em;
  font-weight: 700;
  color: #00ff41;
  margin-bottom: 40px;
  letter-spacing: 3px;
  text-transform: uppercase;
  border-bottom: 2px dashed #00ff41;
  padding-bottom: 20px;
}

h2 {
  font-size: 1.8em;
  font-weight: 600;
  color: #00d4ff;
  margin-top: 60px;
  margin-bottom: 25px;
  letter-spacing: 2px;
}

h3 {
  font-size: 1.4em;
  font-weight: 600;
  color: #ffaa00;
  margin-top: 45px;
  margin-bottom: 20px;
}

h4 {
  font-size: 1.2em;
  font-weight: 600;
  color: #00ffaa;
  margin-top: 35px;
  margin-bottom: 15px;
}

h5 {
  font-size: 1em;
  font-weight: 600;
  color: #aa00ff;
  margin-top: 30px;
  margin-bottom: 12px;
}

p {
  margin-bottom: 20px;
  text-align: left;
  border-left: 3px solid #1a1f3a;
  padding-left: 15px;
}

strong {
  font-weight: 700;
  color: #ffaa00;
  background-color: rgba(255, 170, 0, 0.1);
  padding: 2px 4px;
}

em {
  font-style: italic;
  color: #00d4ff;
}

a {
  color: #ff0080;
  text-decoration: none;
  border-bottom: 1px solid #ff0080;
  transition: all 0.3s ease;
}

a:hover {
  color: #00ff41;
  border-bottom-color: #00ff41;
  background-color: rgba(0, 255, 65, 0.1);
}

ul, ol {
  margin-left: 40px;
  margin-bottom: 25px;
}

li {
  margin-bottom: 12px;
  line-height: 1.6;
}

hr {
  border: none;
  border-top: 1px dashed #00ff41;
  margin: 60px 0;
}

img {
  max-width: 100%;
  height: auto;
  margin: 35px 0;
  display: block;
  border: 2px solid #00ff41;
  filter: contrast(1.1) brightness(0.9);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 40px 0;
  border: 2px solid #00ff41;
}

thead {
  background-color: #1a1f3a;
}

th {
  padding: 18px;
  text-align: left;
  font-weight: 700;
  color: #00ff41;
  letter-spacing: 1px;
  font-size: 0.95em;
  border-bottom: 2px solid #00ff41;
}

tr {
  border-bottom: 1px solid #1a1f3a;
}

tr:hover {
  background-color: rgba(0, 255, 65, 0.05);
}

td {
  padding: 16px 18px;
  font-size: 0.95em;
  color: #00d4ff;
}

tbody tr:last-child {
  border-bottom: none;
}`,
  MINIMALIST_MODERN: `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  line-height: 1.7;
  color: #222;
  background-color: #fff;
  padding: 90px 110px;
  max-width: 920px;
  margin: 0 auto;
}

h1 {
  font-size: 1.85em;
  font-weight: 300;
  color: #000;
  margin-bottom: 60px;
  letter-spacing: -0.4px;
  line-height: 1.3;
}

h2 {
  font-size: 1.4em;
  font-weight: 400;
  color: #000;
  margin-top: 70px;
  margin-bottom: 26px;
  letter-spacing: -0.25px;
}

h3 {
  font-size: 1.15em;
  font-weight: 500;
  color: #1a1a1a;
  margin-top: 50px;
  margin-bottom: 20px;
}

h4 {
  font-size: 1.05em;
  font-weight: 600;
  color: #333;
  margin-top: 40px;
  margin-bottom: 16px;
}

h5 {
  font-size: 0.95em;
  font-weight: 600;
  color: #444;
  margin-top: 32px;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

p {
  margin-bottom: 20px;
  text-align: left;
}

strong {
  font-weight: 600;
  color: #000;
}

em {
  font-style: italic;
  color: #333;
}

a {
  color: #000;
  text-decoration: none;
  border-bottom: 1px solid #000;
  transition: opacity 0.15s ease;
}

a:hover {
  opacity: 0.6;
}

ul, ol {
  margin-left: 32px;
  margin-bottom: 24px;
}

li {
  margin-bottom: 10px;
  line-height: 1.7;
}

hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 80px 0;
}

img {
  max-width: 100%;
  height: auto;
  margin: 40px 0;
  display: block;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 50px 0;
}

thead {
  border-bottom: 2px solid #000;
}

th {
  padding: 18px 16px;
  text-align: left;
  font-weight: 500;
  color: #000;
  letter-spacing: 0.2px;
  font-size: 0.9em;
}

tr {
  border-bottom: 1px solid #eee;
}

tr:hover {
  background-color: #fafafa;
}

td {
  padding: 16px;
  font-size: 0.95em;
  color: #222;
}

tbody tr:last-child {
  border-bottom: none;
}`,
  REFINED_ELEGANCE: `
  * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Helvetica Neue", "Arial", sans-serif;
  line-height: 1.65;
  color: #1a1a1a;
  background-color: #fefefe;
  padding: 70px 90px;
  max-width: 880px;
  margin: 0 auto;
}

h1 {
  font-size: 1.95em;
  font-weight: 400;
  color: #000;
  margin-bottom: 50px;
  letter-spacing: -0.3px;
  line-height: 1.25;
  padding-left: 4px;
  border-left: 3px solid #000;
}

h2 {
  font-size: 1.5em;
  font-weight: 500;
  color: #000;
  margin-top: 60px;
  margin-bottom: 24px;
  letter-spacing: -0.2px;
}

h3 {
  font-size: 1.2em;
  font-weight: 500;
  color: #333;
  margin-top: 45px;
  margin-bottom: 18px;
}

h4 {
  font-size: 1.05em;
  font-weight: 600;
  color: #444;
  margin-top: 35px;
  margin-bottom: 14px;
}

h5 {
  font-size: 0.95em;
  font-weight: 600;
  color: #555;
  margin-top: 28px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

p {
  margin-bottom: 18px;
  text-align: left;
}

strong {
  font-weight: 600;
  color: #000;
}

em {
  font-style: italic;
}

a {
  color: #000;
  text-decoration: none;
  border-bottom: 1px solid #ccc;
  transition: border-color 0.2s ease;
}

a:hover {
  border-bottom-color: #000;
}

ul, ol {
  margin-left: 28px;
  margin-bottom: 22px;
}

li {
  margin-bottom: 9px;
  line-height: 1.65;
}

hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 70px 0;
}

img {
  max-width: 100%;
  height: auto;
  margin: 35px 0;
  display: block;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 45px 0;
}

thead {
  background-color: #fafafa;
  border-bottom: 2px solid #000;
}

th {
  padding: 16px 14px;
  text-align: left;
  font-weight: 500;
  color: #000;
  letter-spacing: 0.3px;
  font-size: 0.9em;
}

tr {
  border-bottom: 1px solid #e8e8e8;
}

tr:hover {
  background-color: #fafafa;
}

td {
  padding: 14px;
  font-size: 0.95em;
}

tbody tr:last-child {
  border-bottom: none;
}`,
};

const htmlTemplate = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
            ${STYLE_DATA_PLACEHOLDER}
        </style>
    </head>
    <body>
    ${HTML_DATA_PLACEHOLDER}
    </body>
</html>
`;

export const styledHtml = (toWrap: string, style: StyleName): string => {
  return htmlTemplate
    .replaceAll(HTML_DATA_PLACEHOLDER, toWrap)
    .replaceAll(STYLE_DATA_PLACEHOLDER, stylesMap[style]!);
};
