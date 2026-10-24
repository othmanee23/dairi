import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const configuredSiteUrl = String(env.VITE_PUBLIC_SITE_URL ?? '').trim();
let siteUrl = '';
try {
  const parsedSiteUrl = new URL(configuredSiteUrl);
  if (parsedSiteUrl.protocol === 'https:' && !parsedSiteUrl.username && !parsedSiteUrl.password && parsedSiteUrl.pathname === '/' && !parsedSiteUrl.search && !parsedSiteUrl.hash) siteUrl = parsedSiteUrl.origin;
} catch { /* Missing or malformed public domains keep indexing disabled. */ }
const outputDirectory = resolve('dist');
const indexPath = resolve(outputDirectory, 'index.html');
await mkdir(outputDirectory, { recursive: true });

const staticPaths = ['/store', '/store/shop', '/store/sale', '/store/journal', '/store/wholesale', '/store/support'];
const adminPaths = ['/auth/', '/products', '/collections', '/lookbooks', '/activity', '/settings', '/wholesale-applications'];

if (!siteUrl || !/^https:\/\//i.test(siteUrl)) {
  await writeFile(resolve(outputDirectory, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  console.log('SEO assets: indexing disabled because VITE_PUBLIC_SITE_URL is not set to an HTTPS origin.');
} else {
  const urls = new Set(staticPaths.map(path => `${siteUrl}${path}`));
  const apiUrl = String(env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (apiUrl && anonKey) {
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    const catalogRequests = [
      ['products?select=id&status=eq.published&show_on_website=eq.true', '/store/products/'],
      ['collections?select=id&is_published=eq.true', '/store/collections/'],
    ];
    for (const [query, route] of catalogRequests) {
      try {
        const response = await fetch(`${apiUrl}/rest/v1/${query}`, { headers });
        if (!response.ok) throw new Error(`Catalog returned HTTP ${response.status}`);
        const records = await response.json();
        for (const record of records) if (record.id) urls.add(`${siteUrl}${route}${encodeURIComponent(record.id)}`);
      } catch (error) {
        console.warn(`SEO assets: could not add ${route} catalog pages to sitemap: ${error instanceof Error ? error.message : 'request failed'}`);
      }
    }
  }

  const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\n${adminPaths.map(path => `Disallow: ${path}`).join('\n')}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  await writeFile(resolve(outputDirectory, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(resolve(outputDirectory, 'robots.txt'), robots, 'utf8');

  const index = await readFile(indexPath, 'utf8');
  const canonical = `\n      <link rel="canonical" href="${xmlEscape(`${siteUrl}/store`)}" />`;
  const publicIndex = index.replace('<meta name="robots" content="noindex, nofollow" />', '<meta name="robots" content="index, follow" />').replace('</head>', `${canonical}\n    </head>`);
  await writeFile(indexPath, publicIndex, 'utf8');
  console.log(`SEO assets: sitemap includes ${urls.size} public storefront and catalog URLs.`);
}
