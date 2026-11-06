// the welcome never asks for a degree: it follows from the slots a student
// keeps, and a slot only counts once it's really been answered.
import { expect, test } from 'vitest';
import { DegreeAnswers } from '$lib/components/welcome/answers.svelte';
import { electiveChoices } from '$lib/planner/electives';
import { Plan } from '$lib/planner/plan.svelte';

function welcome() {
	const plan = new Plan();
	plan.placements = {};
	return { plan, answers: new DegreeAnswers(plan) };
}

test('the slots kept decide the degree', () => {
	const { plan, answers } = welcome();
	answers.setBatch(2026);
	answers.pick('mathematics');
	answers.add('minor');
	answers.pick('physics');
	expect(plan.structure).toBe('major-minor');
	answers.add('conc');
	expect(plan.structure).toBe('major-minor-conc');
	answers.remove('minor');
	answers.remove('conc');
	expect(plan.structure).toBe('single-major');
	answers.add('major2');
	expect(plan.structure).toBe('double-major');
});

test('a second major stands alone, and is only offered with nothing beside the major', () => {
	const { answers } = welcome();
	expect(answers.extras).toEqual([]);
	expect(answers.roles).toEqual(['major1']);
	expect(answers.addable).toEqual(['minor', 'conc', 'major2']);
	answers.pick('mathematics');
	answers.add('major2');
	expect(answers.active).toBe('major2');
	expect(answers.addable).toEqual([]);
	answers.remove('major2');
	answers.add('minor');
	expect(answers.addable).not.toContain('major2');
});

test('picking stays on the chosen slot, and the major comes first', () => {
	const { answers } = welcome();
	expect(answers.canFocus('minor')).toBe(false);
	answers.pick('mathematics');
	expect(answers.active).toBe('major1');
	answers.pick('biology');
	expect(answers.active).toBe('major1');
	answers.add('minor');
	expect(answers.active).toBe('minor');
	expect(answers.canFocus('minor')).toBe(true);
});

test('it is ready once the batch and every kept slot are answered', () => {
	const { answers } = welcome();
	answers.pick('mathematics');
	expect(answers.ready).toBe(false);
	answers.setBatch(2026);
	expect(answers.ready).toBe(true);
	answers.add('minor');
	expect(answers.ready).toBe(false);
	answers.pick('physics');
	expect(answers.ready).toBe(true);
	answers.add('conc');
	expect(answers.ready).toBe(false);
});

test('a subject held by another slot can not be picked twice', () => {
	const { answers } = welcome();
	answers.pick('mathematics');
	answers.add('minor');
	expect(answers.heldBy('mathematics')).toBe('major1');
	answers.pick('physics');
	answers.focus('major1');
	expect(answers.heldBy('physics')).toBe('minor');
	expect(answers.heldBy('mathematics')).toBeUndefined();
});

test('the grid fills in only with what has been answered', () => {
	const { plan, answers } = welcome();
	answers.setBatch(2026);
	const core = plan.placed.length;
	expect(core).toBeGreaterThan(0);
	answers.pick('mathematics');
	expect(plan.placed.length).toBeGreaterThan(core);
});

test('the electives left to choose skip what is placed and list a shared course once', () => {
	const { plan, answers } = welcome();
	answers.setBatch(2026);
	answers.pick('mathematics');
	answers.add('minor');
	answers.pick('physics');
	const codes = electiveChoices(plan).flatMap((g) => g.codes);
	expect(codes.length).toBeGreaterThan(0);
	expect(new Set(codes).size).toBe(codes.length);
	expect(codes.some((code) => plan.placedCodes.has(code))).toBe(false);
});

test('three-year setup allows a minor or concentration, but not both', () => {
	const { plan, answers } = welcome();
	answers.setFourYear(false);
	answers.pick('computer science');
	answers.add('minor');
	expect(answers.addable).toEqual([]);
	answers.add('conc');
	expect(plan.structure).toBe('major-minor');
	answers.remove('minor');
	answers.add('conc');
	expect(answers.addable).toEqual([]);
	expect(plan.structure).toBe('major-conc');
});

test('turning off four years drops the concentration slot from setup', () => {
	const { plan, answers } = welcome();
	answers.pick('computer science');
	answers.add('minor');
	answers.add('conc');
	answers.setFourYear(false);
	expect(plan.structure).toBe('major-minor');
	expect(answers.roles).toEqual(['major1', 'minor']);
	expect(answers.active).not.toBe('conc');
});

test('sidebar degree change keeps placed courses when dropping the concentration', () => {
	const plan = new Plan();
	plan.structure = 'major-minor-conc';
	plan.touched = true;
	plan.placements = { '2-1': ['COMP204'] };
	plan.fourYear = false;
	plan.programmeChanged();
	expect(plan.structure).toBe('major-minor');
	expect(plan.placements['2-1']).toEqual(['COMP204']);
});
