import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function useRoutes(app, deps) {
  const files = fs.readdirSync(__dirname);
  for (const file of files) {
    if (file === 'index.js' || !file.endsWith('.js')) continue;
    const filePath = path.join(__dirname, file);
    const routeModule = await import(pathToFileURL(filePath));
    if (typeof routeModule.default === 'function') {
      const router = routeModule.default({ ...deps }, bot);
      if (!router || typeof router !== "function" || typeof router.use !== "function") {
        log(`[INTERNAL ROUTE] Skipped ${file}: invalid router export.`, "error");
        continue;
      }
      app.use('/', router);
      log(`[INTERNAL ROUTE] Loaded local route: ${file}.`, "success");
    }
  }
}
