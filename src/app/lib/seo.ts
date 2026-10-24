import { useEffect } from 'react';

const fallbackTitle = 'DAIRI | Contemporary Women’s Fashion';
const fallbackDescription = 'Discover contemporary women’s clothing from the DAIRI studio. Explore new collections, product details, and wholesale inquiries.';
function getPublicSiteUrl(value: string | undefined) {
  try {
    const parsed = new URL(value ?? '');
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash ? parsed.origin : '';
  } catch { return ''; }
}
const publicSiteUrl = getPublicSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL);

type PageSeo = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  structuredData?: Record<string, unknown>;
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function usePageSeo({ title, description, path, image, structuredData }: PageSeo) {
  const structuredDataText = structuredData ? JSON.stringify(structuredData) : '';
  useEffect(() => {
    const canonicalUrl = publicSiteUrl && path ? `${publicSiteUrl}${path}` : '';
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', publicSiteUrl ? 'index,follow' : 'noindex,nofollow');
    setMeta('property', 'og:type', structuredData ? 'product' : 'website');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl || window.location.href);
    if (image) setMeta('property', 'og:image', image);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl;
    } else canonical?.remove();

    let jsonLd = document.head.querySelector<HTMLScriptElement>('#dairi-page-structured-data');
    if (structuredDataText) {
      if (!jsonLd) {
        jsonLd = document.createElement('script');
        jsonLd.id = 'dairi-page-structured-data';
        jsonLd.type = 'application/ld+json';
        document.head.appendChild(jsonLd);
      }
      jsonLd.textContent = structuredDataText;
    } else jsonLd?.remove();

    return () => {
      if (document.title === title) document.title = fallbackTitle;
      setMeta('name', 'description', fallbackDescription);
      setMeta('name', 'robots', 'noindex,nofollow');
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:title', fallbackTitle);
      setMeta('property', 'og:description', fallbackDescription);
      setMeta('property', 'og:url', window.location.href);
      canonical?.remove();
      document.getElementById('dairi-page-structured-data')?.remove();
    };
  }, [title, description, path, image, structuredDataText]);
}
