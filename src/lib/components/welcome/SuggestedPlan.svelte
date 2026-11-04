<script lang="ts">
	import { byCode } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	const plan = usePlan();
</script>

<div class="suggestion-grid" aria-label="suggested plan grid">
	<div class="path">
		{#each plan.years as y (y)}
			{#each plan.trims as t (t)}<div class="cell" data-year={y} data-trim={t}>
					{#each plan.recommended[`${y}-${t}`] ?? [] as code (code)}<span
							class="rc"
							data-type={plan.courseType(code)}
							style:--hue={plan.hueOf(code)}
							title="{plan.shownCode(code)} · {byCode(code).title}"
							><b>{plan.shownCode(code)}</b><span>{byCode(code).title}</span></span
						>{/each}
					{#if plan.electivesFor(y, t)}<span class="elective"
							>+ {plan.electivesFor(y, t)} elective{plan.electivesFor(y, t) === 1 ? '' : 's'}</span
						>{/if}
				</div>{/each}{/each}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;
	.suggestion-grid {
		max-height: 42rem;
		overflow-y: auto;
		padding: 0.8rem;
		border: 1px solid var(--color-border-card);
		border-radius: 8px;
		background: var(--color-grid-cell);
	}
	.path {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}
	.cell {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-height: 5rem;
		padding: 0.5rem;
		background: var(--color-bg-light);
		border-radius: 5px;
	}
	.rc {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		padding: 0.3rem 0.5rem;
		font-size: 1.1rem;
		border-radius: 4px;
		@include course-type-fill(false);
	}
	.rc b {
		white-space: nowrap;
	}
	.rc span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.elective {
		padding: 0.3rem;
		font-size: 1rem;
		text-align: center;
		color: var(--color-text-muted);
		border: 1px dashed var(--color-border-card);
		border-radius: 4px;
	}
	@media (max-width: 600px) {
		.path {
			gap: 0.3rem;
		}
		.cell {
			padding: 0.3rem;
		}
		.rc {
			display: block;
			font-size: 0.95rem;
			padding: 0.3rem;
		}
		.rc span {
			display: block;
		}
	}
</style>
