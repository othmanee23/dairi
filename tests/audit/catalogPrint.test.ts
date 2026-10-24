import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const printStyles = await readFile(new URL('../../src/styles/admin.css', import.meta.url), 'utf8');
const previewSource = await readFile(new URL('../../src/app/pages/lookbooks/LookbookPreview.tsx', import.meta.url), 'utf8');

test('standard catalog cover is kept on one printed page', () => {
  const coverPage = printStyles.match(/\.lookbook-print-root \.lookbook-cover-page\s*\{([^}]+)\}/)?.[1] ?? '';
  const masthead = printStyles.match(/\.lookbook-print-root \.lookbook-cover-masthead\s*\{([^}]+)\}/)?.[1] ?? '';
  const image = printStyles.match(/\.lookbook-print-root \.lookbook-cover-image\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(coverPage, /overflow:\s*hidden/);
  assert.match(coverPage, /position:\s*relative/);
  assert.doesNotMatch(coverPage, /display:\s*block/);
  assert.match(masthead, /flex:\s*0 0 28%/);
  assert.doesNotMatch(masthead, /position:\s*absolute/);
  assert.match(image, /flex:\s*1 1 auto/);
  assert.match(image, /min-height:\s*0/);
  assert.doesNotMatch(image, /position:\s*absolute/);
  assert.match(printStyles, /\.lookbook-print-root \.lookbook-catalog-page\s*\{[^}]*break-inside:\s*avoid-page/);
  assert.match(printStyles, /body:not\(\.dairi-line-sheet-mode\) > #root[^\{]*\.admin-page,/s);
  assert.match(printStyles, /\.admin-page > \*:not\(\.lookbook-print-root\):not\(\.dairi-line-sheet-print-root\)\s*\{\s*display:\s*none !important/s);
  assert.match(previewSource, /await waitForPrintImages\('\.dairi-line-sheet-print-root'\)/);
  assert.match(printStyles, /display:\s*none !important/);
});

test('lookbook preview exposes one PDF download and it uses the DAIRI template', () => {
  assert.equal((previewSource.match(/onClick=\{handleDairiDownload\}/g) ?? []).length, 1);
  assert.doesNotMatch(previewSource, /onClick=\{handleDownload\}|Preview standard catalog|Preview DAIRI template/);
  assert.match(previewSource, /await waitForPrintImages\('\.dairi-line-sheet-print-root'\)/);
  assert.match(previewSource, /DAIRI A4 template/);
});
