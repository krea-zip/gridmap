// a subject one role holds stays in the later roles' lists, disabled and
// named, and a collision bumps the later role, never the earlier
import { expect, test } from 'vitest';
import { keepPicksDistinct, optionLabel, pickOptions, type Picks } from '$lib/planner/picks';

const picks = (p: Partial<Picks> = {}): Picks => ({
	major1: 'mathematics',
	major2: 'history',
	minor: 'physics',
	conc: 'economics',
	...p
});
const held = (options: ReturnType<typeof pickOptions>) => options.filter((o) => o.heldAs).map(optionLabel);

test('the minor lists the major, disabled and named', () => {
	const options = pickOptions('major-minor', picks(), 'minor', 2026);
	expect(options.some((o) => o.subject.id === 'mathematics')).toBe(true);
	expect(held(options)).toEqual(['mathematics (major)']);
});

test('a concentration names both the major and the minor', () => {
	expect(held(pickOptions('major-minor-conc', picks(), 'conc', 2026)).sort()).toEqual([
		'mathematics (major)',
		'physics (minor)'
	]);
});

test('a double major calls the first one the first major', () => {
	expect(held(pickOptions('double-major', picks(), 'major2', 2026))).toEqual(['mathematics (first major)']);
});

test("the first role's list holds nothing back", () => {
	expect(held(pickOptions('major-minor-conc', picks(), 'major1', 2026))).toEqual([]);
});

test('a collision moves the later role to a free real subject', () => {
	const p = picks({ minor: 'mathematics' });
	keepPicksDistinct('major-minor', p, 2026);
	expect(p.major1).toBe('mathematics');
	expect(p.minor).not.toBe('mathematics');
	expect(p.minor).not.toBe('open');
});

test('roles the degree has no use for are left alone', () => {
	const p = picks({ conc: 'mathematics' });
	keepPicksDistinct('major-minor', p, 2026);
	expect(p.conc).toBe('mathematics');
});

test('a pick the batch does not offer stays listed and says so', () => {
	const options = pickOptions('single-major', { ...picks(), major1: 'philosophy' }, 'major1', 2026);
	expect(options.at(-1)).toMatchObject({ closed: true });
	expect(optionLabel(options.at(-1)!)).toBe('philosophy (not offered to this batch)');
});

test('an offered pick is not marked', () => {
	expect(pickOptions('single-major', picks(), 'major1', 2026).some((o) => o.closed)).toBe(false);
});
