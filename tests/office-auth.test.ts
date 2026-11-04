import { test } from 'vitest';
import assert from 'node:assert/strict';
import { passwordMatches, sessionName, sessionValue } from '../src/lib/server/officeAuth.ts';

const password = 'registrar-2026';

test('only the exact password signs in', () => {
	assert.equal(passwordMatches(password, 'registrar-2026'), true);
	for (const wrong of ['', 'Registrar-2026', 'registrar-2026 ', 'registrar'])
		assert.equal(passwordMatches(password, wrong), false);
});

test('a session names who signed in until it expires', () => {
	const now = Date.UTC(2026, 10, 3);
	const value = sessionValue(password, 'Priya', now);
	assert.equal(sessionName(password, value, now + 60_000), 'Priya');
	assert.equal(sessionName(password, value, now + 8 * 24 * 60 * 60 * 1000), null);
});

test('a forged, edited or stale-password session is refused', () => {
	const now = Date.UTC(2026, 10, 3);
	const value = sessionValue(password, 'Priya', now);
	const [, signature] = value.split('.');
	const edited = Buffer.from(JSON.stringify({ name: 'Someone', exp: now + 1e9 })).toString('base64url');
	assert.equal(sessionName(password, `${edited}.${signature}`, now), null);
	assert.equal(sessionName('a-new-password', value, now), null);
	for (const junk of [undefined, '', 'abc', '.', 'a.b.c']) assert.equal(sessionName(password, junk, now), null);
});
