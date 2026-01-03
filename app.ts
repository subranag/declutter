import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel } from 'ai';
import {
  boolean,
  command,
  flag,
  number,
  option,
  optional,
  positional,
  run,
  runSafely,
  string,
  subcommands,
  type Type,
} from 'cmd-ts';
import { declutterUrl } from './declutter';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { createOllama } from 'ai-sdk-ollama';
import { isErr } from 'cmd-ts/dist/cjs/Result';
import { stdin as input, stdout as output } from 'process';
import * as readline from 'readline/promises';
import { DEFAULT_STYLE, stylesMap, type StyleName } from './outputs';

const HTTPS_START = /^https?:\/\//;
const DEFAULT_FORMAT = 'pdf' as const;
const DEFAULT_MAX_OUTPUT_TOKENS = 10_000 as const;
const allowedFormats = ['md', DEFAULT_FORMAT, 'html'] as const;
export type AllowedFormats = (typeof allowedFormats)[number];

const OutputFormatType: Type<string, AllowedFormats> = {
  async from(params: string): Promise<AllowedFormats> {
    if (!params || !allowedFormats.includes(params as AllowedFormats)) {
      throw new Error(`format can only be one of : ${allowedFormats}`);
    }
    return params as AllowedFormats;
  },
};

const OutputStyling: Type<string, StyleName> = {
  async from(params: string): Promise<StyleName> {
    const styleNames = Object.keys(stylesMap);
    if (!params || !styleNames.includes(params)) {
      throw new Error(`style can only be one of : ${styleNames.join(', ')}`);
    }
    return params as StyleName;
  },
};

const defaultOutputDirectory = () => {
  return `${homedir()}${path.sep}Documents`;
};

const OutputDirectoryType: Type<string, string> = {
  async from(params: string): Promise<string> {
    try {
      // Check if the directory exists and is writable
      await access(params, constants.F_OK | constants.W_OK);
      return params;
    } catch (error) {
      throw new Error(
        `Cannot generate output in ${params} directory please provide write permissions`
      );
    }
  },
};

const UrlType: Type<string, URL> = {
  async from(params: string): Promise<URL> {
    const normalized =
      params && !HTTPS_START.test(params) ? `https://${params}` : params;
    return new URL(normalized);
  },
};

const provideDefaultModel = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-4-sonnet',
  openai: 'gpt-4o-mini',
  openrouter: 'google/gemini-2.0-flash-exp:free',
  ollama: 'deepseek-r1:7b',
} as const;

const exec = command({
  name: 'exec',
  description: `Declutter a given URL into a document`,
  args: {
    url: positional({ type: UrlType, displayName: 'the url to declutter' }),
    maxTokens: option({
      type: number,
      long: 'max_tokens',
      short: 't',
      defaultValue: () => DEFAULT_MAX_OUTPUT_TOKENS,
      description: `max tokens in the output from the LLM, set this to high values if the page is really big, default is ${DEFAULT_MAX_OUTPUT_TOKENS}`,
    }),
    outputFormat: option({
      type: OutputFormatType,
      long: 'format',
      short: 'f',
      description: `format of the decluttered output should be one of : ${allowedFormats.join(
        ', '
      )}, defaults to ${DEFAULT_FORMAT}`,
      defaultValue: () => DEFAULT_FORMAT,
    }),
    styleName: option({
      type: OutputStyling,
      long: 'style',
      short: 's',
      description: `styling of the decluttered output should be one of : ${Object.keys(
        stylesMap
      ).join(', ')}, defaults to ${DEFAULT_STYLE}`,
      defaultValue: () => DEFAULT_STYLE,
    }),
    outputDirectory: option({
      type: OutputDirectoryType,
      long: 'directory',
      short: 'd',
      description: `The directory to which the output should be written defaults to ${defaultOutputDirectory()}`,
      defaultValue: () => defaultOutputDirectory(),
    }),
    geminiKey: option({
      type: optional(string),
      long: 'gemini-key',
      env: 'GEMINI_API_KEY',
      short: 'g',
      description: `the gemini API key to be used, by default the env variable GEMINI_API_KEY is used`,
    }),
    openAiKey: option({
      type: optional(string),
      long: 'openai-key',
      env: 'OPENAI_API_KEY',
      short: 'o',
      description: `the OpenAI API key to be used, by default the env variable OPENAI_API_KEY is used`,
    }),
    openRouterKey: option({
      type: optional(string),
      long: 'open-router-key',
      env: 'OPENROUTER_API_KEY',
      short: 'r',
      description: `the Open router API key to be used, by default the env variable OPENROUTER_API_KEY is used`,
    }),
    modelName: option({
      type: optional(string),
      long: 'model-name',
      env: 'DEFAULT_DECLUTTER_MODEL',
      short: 'm',
      description: `the model name to be used with the selected provider, by default the env variable DEFAULT_DECLUTTER_MODEL is used. 
  if a model is not provided the tool will use its own default model for each provider\n${Object.entries(
    provideDefaultModel
  )
    .map(([provider, model]) => `  - ${provider} -> ${model}`)
    .join('\n')}
      `,
    }),
    useOllama: flag({
      type: boolean,
      long: 'ollama',
      short: 'l',
      description:
        'use local ollama model for decluttering (ollama must be installed) and model must be present',
    }),
  },
  handler: async ({
    url,
    maxTokens,
    outputFormat,
    outputDirectory,
    geminiKey,
    openAiKey,
    openRouterKey,
    modelName,
    useOllama,
    styleName,
  }) => {
    try {
      await declutterUrl({
        url: url,
        model: getModel({
          geminiKey,
          openAiKey,
          openRouterKey,
          useOllama,
          modelName,
        }),
        maxTokens,
        outputFormat,
        outputDirectory,
        styleName,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error Decluttering: ${error.message}`);
      }
    }
  },
});

const getModel = ({
  geminiKey,
  openAiKey,
  openRouterKey,
  useOllama,
  modelName,
}: {
  geminiKey?: string;
  openAiKey?: string;
  openRouterKey?: string;
  useOllama: boolean;
  modelName?: string;
}): LanguageModel => {
  if (useOllama) {
    const ollama = createOllama();
    return ollama(modelName ?? provideDefaultModel.ollama, {
      options: {
        num_ctx: 30000,
      },
    });
  }

  if (geminiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });
    return google(modelName ?? provideDefaultModel.gemini);
  }

  if (openAiKey) {
    const openAi = createOpenAI({
      apiKey: openAiKey,
    });
    return openAi(modelName ?? provideDefaultModel.openai);
  }

  if (openRouterKey) {
    const openRouter = createOpenRouter({
      apiKey: openRouterKey,
    });
    return openRouter(modelName ?? provideDefaultModel.openrouter);
  }

  throw new Error(`Please setup at least one provider as shown in the tool`);
};

const repl = command({
  name: 'repl',
  description: `Start declutter in REPL mode where you declutter multiple URLs in a single session`,
  args: {},
  handler: async () => {
    console.log('🚀 Welcome to declutter REPL mode!');
    console.log("Type 'exit' or press Ctrl+C to quit at any time.");

    const rl = readline.createInterface({ input, output });

    while (true) {
      const input = await rl.question('> ');

      if (input.toLowerCase().trim() === 'exit') {
        console.log('👋 Goodbye! Exiting REPL.');
        rl.close();
        break;
      }

      const args = input.split(' ').filter((val) => val);
      const result = await runSafely(exec, args);
      if (isErr(result)) {
        console.log(result.error.config.message);
      }
    }
  },
});

const app = subcommands({
  name: 'declutter',
  description: `A super simple tool that declutters any URL provided into awesome documents for reading
   * provide full URLs as copied from the browser
   * if possible the tool performs a full declutter and prints the output to several formats
   * NOTE: if you feel exec mode is slow please try REPL mode which keeps the browser session alive across multiple declutter calls`,
  cmds: {
    exec,
    repl,
  },
});

export const runApp = async (args: string[]) => {
  await run(app, process.argv.slice(2));
};
