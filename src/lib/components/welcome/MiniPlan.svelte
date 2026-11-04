<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	import { usePractice } from './practice-context';
	import { baseCode, byCode, isAttemptId } from '$lib/curriculum/data';
	import { degreeTrim, termMonthsShort } from '$lib/planner/calendar';
	import { carried, carry } from '$lib/ui/courseDrag';
	import type { TrimNum } from '$lib/types';
	import type { Lesson } from './lessons';
	import CourseChip from './CourseChip.svelte';
	let { lesson }: { lesson: Lesson } = $props();
	const plan = usePlan();
	const { interaction, detail } = usePractice();
	function event(action: typeof interaction.action, code: string | null) {
		interaction.action = action;
		interaction.code = code;
		interaction.revision++;
	}
	function pick(id: string, drag = false) {
		const code = baseCode(id);
		if (lesson === 'board') {
			interaction.picked = drag ? code : interaction.picked === code ? null : code;
			event('pick', code);
		} else {
			plan.select(id);
			event('open', code);
		}
	}
	function place(year: number, trim: TrimNum, code = interaction.picked) {
		if (!code || !plan.canDrop(code, year, trim)) return;
		const before = plan.placed.find((p) => p.code === code);
		plan.place(code, year, trim);
		interaction.picked = null;
		event(before && (before.year !== year || before.trim !== trim) ? 'move' : 'place', code);
	}
	function drop(e: DragEvent, year: number, trim: TrimNum) {
		e.preventDefault();
		place(year, trim, carried(e));
	}
	const fits = (year: number, trim: TrimNum) =>
		lesson === 'board' && !!interaction.picked && plan.canDrop(interaction.picked, year, trim);
	function heading(trim: TrimNum) {
		if (lesson !== 'terms' && lesson !== 'catalogue') return;
		plan.zoom = plan.zoom?.trim === trim ? null : { year: plan.here.year, trim };
		event('heading', null);
	}
	const interactive = () => lesson === 'board' || lesson === 'details' || lesson === 'about';
</script>

<div
	class="miniature-plan"
	data-cols="3"
	data-rows={plan.fourYear ? 4 : 3}
	aria-label="miniature plan: 3 trimester columns and {plan.fourYear ? 4 : 3} year rows"
	role="group"
>
	<div class="miniature-grid">
		<div></div>
		{#each plan.trims as t (t)}<button
				class="mini-term"
				class:on={plan.zoom?.trim === t}
				disabled={lesson !== 'terms' && lesson !== 'catalogue'}
				aria-label="filter catalogue by t{t}"
				aria-pressed={plan.zoom?.trim === t}
				onclick={() => heading(t)}>{plan.trimNaming === 'year' ? `t${t}` : termMonthsShort(t)}</button
			>{/each}
		{#each plan.years as year (year)}<span class="mini-year">y{year}</span>{#each plan.trims as trim (trim)}
				{@const courses = plan.attempts.filter((p) => p.year === year && p.trim === trim)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="mini-cell"
					data-year={year}
					data-trim={trim}
					class:fits={fits(year, trim)}
					class:lit={plan.highlightSlots.includes(`${year}-${trim}`)}
					ondragover={(e) => fits(year, trim) && e.preventDefault()}
					ondrop={(e) => drop(e, year, trim)}
				>
					{#each courses as p (p.id)}<div class:attempt={isAttemptId(p.id)}>
							<CourseChip
								code={p.code}
								selected={interaction.picked === p.code || plan.highlight.includes(p.code)}
								mark={plan.gradeOf(p.id) === 'U' || (lesson === 'hints' && p.code === detail) ? 'warn' : undefined}
								onclick={interactive() ? () => pick(p.id) : undefined}
								ondragstart={lesson === 'board'
									? (e) => {
											carry(e, p.code);
											pick(p.id, true);
										}
									: undefined}
								onremove={lesson === 'board'
									? () => {
											plan.remove(p.id);
											interaction.picked = null;
											event('remove', p.code);
										}
									: undefined}
							/>
						</div>{/each}
					{#if fits(year, trim)}<button
							class="mini-place"
							aria-label="place course in y{year} t{trim}"
							onclick={() => place(year, trim)}>+</button
						>{:else if !courses.length}<span class="mini-empty" aria-hidden="true">·</span>{/if}
					{#if plan.trimNaming === 'degree'}<span class="mini-number">t{degreeTrim(year, trim)}</span
						>{/if}{#if courses.length}<span class="mini-credit"
							>{courses.reduce(
								(n, p) => n + (plan.isAudit(p.id) || plan.gradeOf(p.id) === 'U' ? 0 : byCode(p.code).credits),
								0
							)} cr</span
						>{/if}
				</div>
			{/each}{/each}
	</div>
	<div class="mini-caption"><span>your miniature plan</span><b data-mini-total>{plan.totalPlacedCredits} cr</b></div>
</div>

<style>
	.miniature-plan {
		order: -1;
		width: 100%;
		max-width: 43rem;
		margin: 0 auto;
		padding: 0.7rem 0.8rem 0.5rem;
		background: var(--color-grid-cell);
		border: 1px solid var(--color-border-light);
		border-radius: 8px;
	}
	.miniature-grid {
		display: grid;
		grid-template-columns: 2rem repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
	}
	.mini-term {
		font: inherit;
		font-size: 1.2rem;
		padding: 0.1rem;
		background: none;
		color: var(--color-text);
		border: 1px solid transparent;
		border-radius: 4px;
		cursor: pointer;
	}
	.mini-term:disabled {
		cursor: default;
	}
	.mini-term.on {
		background: var(--color-bg-light);
		border-color: var(--color-accent);
	}
	.mini-year {
		align-self: center;
		font-size: 1.15rem;
		color: var(--color-text-muted);
	}
	.mini-cell {
		position: relative;
		min-width: 0;
		min-height: 4.6rem;
		padding: 0.35rem 0.35rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		background: var(--color-bg-light);
		border: 1px dotted var(--color-border-card);
		border-radius: 4px;
		transition: background 0.18s;
	}
	.mini-cell.fits {
		background: var(--color-drop-ok);
		border-color: var(--color-drop-ok-edge);
	}
	.mini-cell.lit {
		outline: 2px solid var(--color-accent);
	}
	.mini-empty {
		margin: auto;
		align-self: center;
		color: var(--color-border-card);
	}
	.mini-credit {
		position: absolute;
		right: 0.4rem;
		bottom: 0.1rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
	.mini-place {
		flex: 1;
		min-height: 1.7rem;
		font: inherit;
		font-size: 1.3rem;
		background: none;
		color: var(--color-text);
		border: 1px dashed var(--color-drop-ok-edge);
		border-radius: 3px;
		cursor: pointer;
	}
	.mini-number {
		position: absolute;
		left: 0.35rem;
		bottom: 0.1rem;
		font-size: 0.8rem;
		color: var(--color-accent);
	}
	.mini-caption {
		display: flex;
		justify-content: space-between;
		padding: 0.35rem 0.2rem 0 2.4rem;
		font-size: 0.95rem;
		color: var(--color-text-muted);
	}
	.mini-cell :global(.mini-course) {
		font-size: 0.95rem;
		gap: 0.3rem;
		padding: 0.3rem 0.4rem;
		min-height: 2.3rem;
	}
	.mini-cell :global(.mini-course .course-title) {
		font-size: 0.9rem;
	}
	.mini-cell :global(.chip-remove) {
		font-size: 1rem;
		right: 0.2rem;
	}
	.attempt :global(.mini-course) {
		opacity: 0.55;
		border-style: dotted;
	}
	@media (max-width: 600px) {
		.miniature-plan {
			padding: 0.5rem;
		}
		.miniature-grid {
			gap: 0.25rem;
			grid-template-columns: 1.7rem repeat(3, minmax(0, 1fr));
		}
		.mini-cell {
			padding: 0.25rem 0.25rem 1.15rem;
			min-height: 4.2rem;
		}
		.mini-cell :global(.mini-course) {
			font-size: 0.85rem;
			padding: 0.25rem;
			gap: 0.2rem;
			min-height: 2rem;
		}
		.mini-cell :global(.mini-course:has(b) .course-title) {
			display: none;
		}
		.mini-cell :global(.mini-course::before) {
			width: 0.5rem;
			height: 0.5rem;
		}
	}
</style>
