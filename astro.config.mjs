// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// The privacy and cookie files (src/fs/legal/) describe Google Analytics with consent. Until
// analytics is live, a deploy would publish a notice that doesn't match the site, so CI refuses.
const analyticsSource = readFileSync(new URL('./src/data/analytics.ts', import.meta.url), 'utf8');
if (process.env.GITHUB_ACTIONS && !/^\s*live:\s*true/m.test(analyticsSource))
  throw new Error(
    'Turn on analytics (src/data/analytics.ts: live, measurementId) before deploying.',
  );

export default defineConfig({
  site: 'https://dev.nevcan.com',
  output: 'static',
  trailingSlash: 'never',
  // 'file': about.html, served by GitHub Pages at /about (a folder would redirect to /about/)
  build: { inlineStylesheets: 'always', format: 'file' },
  integrations: [react(), sitemap()],
});
