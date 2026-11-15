/**
 * Build-time only: reads every file under src/fs/ into the virtual file system. Adding a file
 * there adds it to the explorer, the terminal and a page route; nothing else to register.
 * Markdown (.md) is rendered for Preview; an SVG is shown as the image itself; a photo is
 * re-encoded to WebP (600 and 1200 px wide, no metadata) by astro:assets.
 */
import { statSync } from 'node:fs';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { basename, dirname, resolvePath, routeOf, type Vfs } from './vfs';

const ROOT = '/src/fs/';

/** alt text for each photo (a photo without one gets its file name) */
const ALT: Record<string, string> = {
  'media/nevcan.jpg': 'Nevcan Uludaş, smiling, in front of a pool',
};

const rendered = import.meta.glob<{ compiledContent: () => string | Promise<string> }>(
  '/src/fs/**/*.md',
  { eager: true },
);
const sources = import.meta.glob<string>(['/src/fs/**/*.md', '/src/fs/**/*.svg'], {
  eager: true,
  query: '?raw',
  import: 'default',
});
const images = import.meta.glob<ImageMetadata>('/src/fs/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

/** relative .md links ("../projects/dipnot.md") become page routes ("/projects/dipnot") */
const linkRoutes = (html: string, path: string) =>
  html.replace(/href="([^"#:]+\.md)(#[^"]*)?"/g, (whole, href: string, hash = '') => {
    const target = resolvePath(dirname(path), href);
    return target === null ? whole : `href="${routeOf(target)}${hash}"`;
  });

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

async function render(key: string, path: string, raw: string): Promise<string> {
  if (path.endsWith('.md')) return linkRoutes(await rendered[key]!.compiledContent(), path);
  if (path.endsWith('.svg'))
    return `<figure class="asset">${raw.replace(/<!--[\s\S]*?-->\s*/g, '')}<figcaption>${basename(path)}</figcaption></figure>`;
  return '';
}

let cache: Vfs | undefined;

export async function loadVfs(): Promise<Vfs> {
  if (cache) return cache;
  const vfs: Vfs = {};
  for (const [key, raw] of Object.entries(sources)) {
    const path = key.slice(ROOT.length);
    vfs[path] = {
      path,
      raw,
      html: await render(key, path, raw),
      title: (path.endsWith('.md') && raw.match(/^#\s+(.+)$/m)?.[1]?.trim()) || basename(path),
      route: routeOf(path),
    };
  }
  for (const [key, meta] of Object.entries(images)) {
    const path = key.slice(ROOT.length);
    const img = await getImage({ src: meta, widths: [600, 1200], format: 'webp' });
    const alt = escapeAttr(ALT[path] ?? basename(path));
    vfs[path] = {
      path,
      raw: '',
      html: `<figure class="asset photo"><img src="${img.src}" srcset="${img.srcSet.attribute}" sizes="(max-width: 760px) 90vw, 32rem" width="${meta.width}" height="${meta.height}" alt="${alt}" decoding="async" /><figcaption>${basename(path)} · ${meta.width}×${meta.height}</figcaption></figure>`,
      title: basename(path),
      route: routeOf(path),
      binary: {
        bytes: statSync(process.cwd() + key).size,
        width: meta.width,
        height: meta.height,
        format: meta.format,
      },
    };
  }
  return (cache = vfs);
}
