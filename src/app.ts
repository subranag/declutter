import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel } from 'ai';
import {
  command,
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

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOllama } from 'ai-sdk-ollama';
import { isErr } from 'cmd-ts/dist/cjs/Result';
import { stdin as input, stdout as output } from 'process';
import * as readline from 'readline/promises';
import {
  allowedFormats,
  PDF_OUTPUT_FORMAT,
  DEFAULT_STYLE,
  stylesMap,
  convertMarkdownTo,
  type AllowedFormats,
  type AllowedConvertToFormats,
  type StyleName,
} from './outputs';
import { warn } from './utility';

const HTTPS_START = /^https?:\/\//;

const DEFAULT_MAX_OUTPUT_TOKENS = 10_000 as const;

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

const ConvertOutputFormatType: Type<string, AllowedConvertToFormats> = {
  async from(params: string): Promise<AllowedConvertToFormats> {
    const convertFormats = allowedFormats.filter(
      (f) => f !== 'md'
    ) as AllowedConvertToFormats[];
    if (
      !params ||
      !convertFormats.includes(params as AllowedConvertToFormats)
    ) {
      throw new Error(
        `format can only be one of : ${convertFormats.join(', ')}`
      );
    }
    return params as AllowedConvertToFormats;
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

const GEMINI_PROVIDER = 'gemini';
const ANTHROPIC_PROVIDER = 'anthropic';
const OPENAI_PROVIDER = 'openai';
const OPENROUTER_PROVIDER = 'openrouter';
const OLLAMA_PROVIDER = 'ollama';
const providers = [
  GEMINI_PROVIDER,
  ANTHROPIC_PROVIDER,
  OPENAI_PROVIDER,
  OPENROUTER_PROVIDER,
  OLLAMA_PROVIDER,
] as const;

type Provider = (typeof providers)[number];

const provideDefaultModel: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  openrouter: 'google/gemini-2.0-flash-exp:free',
  ollama: 'deepseek-r1:7b',
};

const ProviderType: Type<string, Provider> = {
  async from(params: string): Promise<Provider> {
    if (!params || !providers.includes(params as Provider)) {
      throw new Error(`provider can only be one of : ${providers.join(', ')}`);
    }
    return params as Provider;
  },
};

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
      )}, defaults to ${PDF_OUTPUT_FORMAT}`,
      defaultValue: () => PDF_OUTPUT_FORMAT,
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
    anthropicKey: option({
      type: optional(string),
      long: 'anthropic-key',
      env: 'ANTHROPIC_API_KEY',
      short: 'a',
      description: `the Anthropic API key to be used, by default the env variable ANTHROPIC_API_KEY is used`,
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
    .map(([provider, model]) => `  * ${provider} -> ${model}`)
    .join('\n')}
      `,
    }),
    provider: option({
      type: optional(ProviderType),
      long: 'provider',
      short: 'p',
      description: `The AI provider to use, provided input should be one of\n${Object.entries(
        provideDefaultModel
      )
        .map(([provider, _]) => `  * ${provider}`)
        .join('\n')}
      NOTE: the API key for the provider must be provided via flags or env variables`,
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
    anthropicKey,
    modelName,
    provider,
    styleName,
  }) => {
    try {
      await declutterUrl({
        url: url,
        model: getModel({
          geminiKey,
          openAiKey,
          openRouterKey,
          anthropicKey,
          modelName,
          provider,
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

type ModelSelectionInput = {
  geminiKey?: string;
  openAiKey?: string;
  openRouterKey?: string;
  anthropicKey?: string;
  modelName?: string;
  provider?: Provider;
};

const getModel = (selctionInput: ModelSelectionInput): LanguageModel => {
  const resolvedProvider = resolveProvider(selctionInput);
  const { geminiKey, openAiKey, openRouterKey, modelName } = selctionInput;

  switch (resolvedProvider) {
    case OLLAMA_PROVIDER:
      const ollama = createOllama();
      return ollama(modelName ?? provideDefaultModel.ollama, {
        options: {
          // TODO: make this configurable via flags
          num_ctx: 30000,
        },
      });
    case ANTHROPIC_PROVIDER:
      const anthropic = createAnthropic({
        apiKey: selctionInput.anthropicKey,
      });
      return anthropic(modelName ?? provideDefaultModel.anthropic);
    case GEMINI_PROVIDER:
      const google = createGoogleGenerativeAI({
        apiKey: geminiKey,
      });
      return google(modelName ?? provideDefaultModel.gemini);
    case OPENAI_PROVIDER:
      const openAi = createOpenAI({
        apiKey: openAiKey,
      });
      return openAi(modelName ?? provideDefaultModel.openai);
    case OPENROUTER_PROVIDER:
      const openRouter = createOpenRouter({
        apiKey: openRouterKey,
      });
      return openRouter(modelName ?? provideDefaultModel.openrouter);
    default:
      throw new Error(`Unsupported provider selected: ${resolvedProvider}`);
  }
};

const resolveProvider = ({
  provider,
  geminiKey,
  openAiKey,
  anthropicKey,
  openRouterKey,
}: ModelSelectionInput): Provider => {
  if (provider) {
    switch (provider) {
      case GEMINI_PROVIDER:
        if (!geminiKey) {
          throw new Error(
            `provider set to ${GEMINI_PROVIDER} but no API key provided`
          );
        }
        return GEMINI_PROVIDER;
      case ANTHROPIC_PROVIDER:
        if (!anthropicKey) {
          throw new Error(
            `provider set to ${ANTHROPIC_PROVIDER} but no API key provided`
          );
        }
        return ANTHROPIC_PROVIDER;
      case OPENAI_PROVIDER:
        if (!openAiKey) {
          throw new Error(
            `provider set to ${OPENAI_PROVIDER} but no API key provided`
          );
        }
        return OPENAI_PROVIDER;
      case OPENROUTER_PROVIDER:
        if (!openRouterKey) {
          throw new Error(
            `provider set to ${OPENROUTER_PROVIDER} but no API key provided`
          );
        }
        return OPENROUTER_PROVIDER;
      default:
        return provider;
    }
  }
  if (geminiKey) {
    return GEMINI_PROVIDER;
  }
  if (openAiKey) {
    return OPENAI_PROVIDER;
  }
  if (openRouterKey) {
    return OPENROUTER_PROVIDER;
  }
  if (anthropicKey) {
    return ANTHROPIC_PROVIDER;
  }

  warn(
    `No provider could be resolved, assuming ${OLLAMA_PROVIDER} with local ollama model`
  );
  return OLLAMA_PROVIDER;
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
      const userInput = await rl.question('> ');

      if (userInput.toLowerCase().trim() === 'exit') {
        console.log('👋 Goodbye! Exiting REPL.');
        rl.close();
        break;
      }

      const args = userInput.split(' ').filter((val) => val);
      const result = await runSafely(exec, args);
      if (isErr(result)) {
        console.log(result.error.config.message);
      }
    }
  },
});

const convert = command({
  name: 'convert',
  description: `Convert a markdown file to another format (html or pdf)`,
  args: {
    markdownFilePath: positional({
      type: string,
      displayName: 'path to markdown file',
    }),
    outputFormat: option({
      type: ConvertOutputFormatType,
      long: 'format',
      short: 'f',
      description: `output format, can be one of: html, pdf`,
      defaultValue: () => PDF_OUTPUT_FORMAT as AllowedConvertToFormats,
    }),
    styleName: option({
      type: OutputStyling,
      long: 'style',
      short: 's',
      description: `styling of the converted output should be one of : ${Object.keys(
        stylesMap
      ).join(', ')}, defaults to ${DEFAULT_STYLE}`,
      defaultValue: () => DEFAULT_STYLE,
    }),
  },
  handler: async ({ markdownFilePath, outputFormat, styleName }) => {
    try {
      await convertMarkdownTo({
        markdownFilePath,
        outputFormat,
        styleName,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error converting markdown: ${error.message}`);
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
    convert,
  },
});

export const runApp = async (args: string[]) => {
  await run(app, process.argv.slice(2));
};
