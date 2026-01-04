import { runApp } from './app';
import { pathFromUrl } from './outputs';

(async () => {
  await runApp(process.argv.slice(2));
})();
