import { runApp } from './app';

(async () => {
  await runApp(process.argv.slice(2));
})();
