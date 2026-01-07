import { runApp } from './app';

globalThis.AI_SDK_LOG_WARNINGS = false;
(async () => {
  await runApp(process.argv.slice(2));
})();
