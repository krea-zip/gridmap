<script lang="ts">
	// what sits beside the miniature on a playground slide: what this part is,
	// what to try (ticked off by the frame as it happens) and how it works with
	// the others. pointing at a task rings its target in the miniature.
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { reducedMotion } from '$lib/ui/transitions';
	import { emphasised, type LessonInfo } from './lessons';
	import PlannerMap from './PlannerMap.svelte';

	let {
		lesson,
		index,
		total,
		done,
		strip = false,
		onpoint
	}: {
		lesson: LessonInfo;
		index: number;
		total: number;
		done: string[];
		/** laid out across the top of the miniature, not down its side */
		strip?: boolean;
		onpoint: (task: string | null) => void;
	} = $props();

	let finished = $derived(lesson.tasks.filter((t) => done.includes(t.id)).length);
	let current = $derived(lesson.tasks.find((t) => !done.includes(t.id))?.id);
	let allDone = $derived(finished === lesson.tasks.length);
	const arrive = () => ({ y: 6, duration: reducedMotion() ? 0 : 220, easing: cubicOut });
</script>

{#snippet words(text: string)}
	{#each emphasised(text) as part, i (i)}{#if part.bold}<b>{part.words}</b>{:else}{part.words}{/if}{/each}
{/snippet}

<section class="guide" class:strip class:finished={allDone}>
	{#key lesson.id}
		<div class="scroll" in:fly={arrive()}>
			<div class="lead">
				<p class="kicker">{index} of {total} · {lesson.label}</p>
				<h3>{lesson.title}</h3>
				<p class="intro">{lesson.intro}</p>
			</div>

			<div class="try">
				<div class="heading">
					<h4>{strip ? 'finish it' : 'try it'}</h4>
					<span class="tally" role="status" aria-label="{finished} of {lesson.tasks.length} done"
						>{finished}/{lesson.tasks.length}</span
					>
				</div>
				<ul class="tasks">
					{#each lesson.tasks as task (task.id)}
						{@const ticked = done.includes(task.id)}
						<!-- pointing only previews where it is; nothing here needs a click -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<li
							class:ticked
							class:current={task.id === current}
							onmouseenter={() => onpoint(task.id)}
							onmouseleave={() => onpoint(null)}
						>
							<input type="checkbox" checked={ticked} disabled aria-label={ticked ? 'done' : 'not done yet'} />
							<span>{@render words(task.text)}</span>
						</li>
					{/each}
				</ul>
				{#if strip && allDone}
					<p class="well-done" in:fly={arrive()}>
						<b>that’s the whole planner.</b> yours works the same way, with more boxes. next, the real one opens with every
						part labelled.
					</p>
				{/if}
			</div>

			{#if lesson.links.length}
				<div class="connects">
					<h4>how it connects</h4>
					<ul>
						{#each lesson.links as link (link)}
							<li>{@render words(link)}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if !strip}
				<div class="where">
					<h4>in your planner</h4>
					<PlannerMap part={lesson.map} />
				</div>
			{/if}
		</div>
	{/key}
</section>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.guide {
		display: flex;
		min-width: 0;
		min-height: 0;
		background: var(--color-bg-light);
	}

	.scroll {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		padding: 1.7rem 2rem;
		overflow-y: auto;
	}

	.kicker {
		@include section-label;
		font-size: 1.1rem;
		color: var(--color-accent);
	}

	h3 {
		margin-top: 0.5rem;
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-text);
	}

	.intro {
		margin-top: 0.6rem;
		font-size: 1.3rem;
		line-height: 1.45;
		color: var(--color-text-muted);
	}

	h4 {
		@include section-label;
		font-size: 1.1rem;
	}

	.heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.tally {
		font-size: 1.2rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		transition: color 0.2s ease;

		.finished & {
			color: var(--color-hint-good-deep);
		}
	}

	.tasks {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-top: 0.7rem;
		list-style: none;

		li {
			display: flex;
			align-items: flex-start;
			gap: 0.9rem;
			padding: 0.6rem 0.9rem;
			margin-inline: -0.9rem;
			font-size: 1.3rem;
			line-height: 1.4;
			color: var(--color-text-muted);
			border: 1px solid transparent;
			border-radius: 6px;
			transition:
				background-color 0.2s ease,
				border-color 0.2s ease,
				color 0.2s ease;

			// the one to do next, ringed to match its target in the miniature
			&.current {
				color: var(--color-text);
				background: color-mix(in srgb, var(--color-accent) 7%, var(--color-bg-light));
				border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
			}

			&.ticked {
				color: var(--color-text-muted);

				b {
					font-weight: 600;
				}
			}
		}

		b {
			font-weight: 700;
			color: var(--color-text);
		}

		input {
			@include tick(1.6rem);
			margin-top: 0.1rem;
			cursor: default;
			pointer-events: none;
		}
	}

	.connects ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.6rem;
		list-style: none;

		li {
			position: relative;
			padding-left: 1.1rem;
			font-size: 1.2rem;
			line-height: 1.4;
			color: var(--color-text-muted);

			// the planner's own required-dot, small
			&::before {
				content: '';
				position: absolute;
				top: 0.6rem;
				left: 0;
				width: 0.4rem;
				height: 0.4rem;
				background: var(--color-border);
				border-radius: 50%;
			}
		}

		b {
			font-weight: 650;
			color: var(--color-text);
		}
	}

	.where {
		margin-top: auto;

		h4 {
			margin-bottom: 0.7rem;
		}
	}

	.well-done {
		margin-top: 0.8rem;
		font-size: 1.3rem;
		line-height: 1.45;
		color: var(--color-text-muted);

		b {
			color: var(--color-text);
		}
	}

	// the last slide: one band across the top, the miniature taking the width
	.strip {
		.scroll {
			flex-direction: row;
			align-items: flex-start;
			gap: 3.2rem;
			padding: 1.3rem 2rem;
		}

		.lead {
			flex: 0 1 38rem;
		}

		h3 {
			font-size: 2rem;
		}

		.intro {
			margin-top: 0.4rem;
		}

		.try {
			flex: 1;
			min-width: 0;
		}

		.heading {
			justify-content: flex-start;
			gap: 0.8rem;
		}

		.tasks {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.2rem 2.4rem;

			li {
				margin-inline: 0;
				padding: 0.5rem 0;
			}

			li.current {
				background: none;
				border-color: transparent;
			}
		}
	}
</style>
