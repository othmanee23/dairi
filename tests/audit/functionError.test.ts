import test from 'node:test';
import assert from 'node:assert/strict';
import { functionErrorMessage } from '../../src/app/context/functionError.ts';

test('function errors prefer the server message when the SDK exposes it', async () => {
  assert.equal(await functionErrorMessage({ message: 'generic', context: new Response(JSON.stringify({ error: 'Inventory changed.' }), { status: 409 }) }), 'Inventory changed.');
});

test('function errors fall back safely when the response has no JSON error', async () => {
  assert.equal(await functionErrorMessage({ message: 'generic', context: new Response('not json', { status: 500 }) }), 'generic');
  assert.equal(await functionErrorMessage({ message: 'generic' }, { error: 'Invalid request.' }), 'Invalid request.');
});
