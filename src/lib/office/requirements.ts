// reading degree requirements out of the draft. a batch graduates under the
// requirement set that names its year, or the default set (batches: null);
// the office pages show what a batch inherits before anyone overrides it.
import type { ProgrammeRequirements, RequirementSet, Variant } from '$lib/curriculum/snapshot';
import type { OfficeDocument } from './model.ts';

/** the requirement set a batch graduates under */
export function setFor(doc: OfficeDocument, batch: number): RequirementSet | undefined {
	const sets = doc.curriculum.requirementSets;
	return sets.find((s) => s.batches?.includes(batch)) ?? sets.find((s) => s.batches === null);
}

export function programmeFor(
	doc: OfficeDocument,
	batch: number,
	subject: string,
	variant: Variant
): ProgrammeRequirements | undefined {
	return setFor(doc, batch)?.programmes.find((p) => p.subject === subject && p.variant === variant);
}

/** the batches the office can still act on: the first with requirement data
 *  to the one starting next year, or further if one is already planned */
export function batchYears(doc: OfficeDocument, now = new Date()): number[] {
	const named = [
		...doc.curriculum.requirementSets.flatMap((s) => s.batches ?? []),
		...(doc.curriculum.batchProfiles ?? []).map((p) => p.batch)
	];
	const first = Math.min(2022, ...named);
	const last = Math.max(now.getFullYear() + 1, ...named);
	return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
