<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	import type { Course, CourseType } from '$lib/types';
	import { codeFor } from '$lib/curriculum/data';
	import { courseIn, courseOut } from '$lib/ui/transitions';
	import { carry } from '$lib/planner/drag/courseDrag';
	import { tick } from 'svelte';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { reducedMotion } from '$lib/ui/transitions';

	let {
		course,
		type,
		placed = false,
		mobile = false,
		contextSubject = undefined
	}: {
		course: Course;
		type: CourseType;
		placed?: boolean;
		mobile?: boolean;
		contextSubject?: string;
	} = $props();
	const plan = usePlan();

	// the code this course goes by in the subject you're browsing (HIST235
	// under history), and the other departments it's cross-listed with
	let shownCode = $derived(codeFor(course, contextSubject));
	let label = $derived(plan.courseLabel(course.code, shownCode));
	let alsoCodes = $derived(course.codes.filter((c) => c !== shownCode));
	// the tools courses are cross-listed across every department, showing
	// all of them makes the card balloon, so cap it and count the rest
	const XLIST_MAX = 2;
	let xlistShown = $derived(alsoCodes.slice(0, XLIST_MAX));
	let xlistExtra = $derived(alsoCodes.length - xlistShown.length);
	let pending = $derived(course.pendingCredits && course.credits === 0);
	// Every course gets room for its title; credit weight is an explicit label.
	let showReq = $derived(type === 'required');
	// Only short courses need a credit label; unknown credit values stay TBC.
	let creditNote = $derived(
		pending
			? 'TBC'
			: course.credits >= 1 && course.credits <= 3
				? `${course.credits} ${course.credits === 1 ? 'credit' : 'credits'}`
				: null
	);

	function dragstart(e: DragEvent) {
		carry(e, course.code);
		plan.dragging = course.code;
	}

	async function openPlaced() {
		plan.highlight = [];
		plan.highlightSlots = [];
		plan.select(course.code);
		if (!viewport.desktop) return;
		plan.zoom = null;
		await tick();
		document
			.querySelector(`.overview .chip[data-code="${CSS.escape(course.code)}"]`)
			?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
	}
</script>

{#if placed}
	<!-- Planned courses stay discoverable as compact rows. -->
	<div
		data-course-card
		tabindex="-1"
		class="card placed"
		class:titles-only={!plan.showCodes}
		class:noted={creditNote !== null}
		title="{label} is already on your plan"
	>
		<button class="placed-open" onclick={openPlaced} aria-label="view {label}, on your plan">
			{#if plan.showCodes}<span class="code">{shownCode}</span>{/if}
			<span class="title">{course.title}</span>
			{#if creditNote}<span class="credit-label" title={pending ? 'credits to confirm' : undefined}>{creditNote}</span
				>{/if}
		</button>
		<button
			class="unplace"
			aria-label="take {label} back off the grid"
			title="take {label} back off the grid"
			onclick={(e) => {
				e.stopPropagation();
				plan.remove(course.code);
			}}>↩</button
		>
	</div>
{:else}
	<button
		type="button"
		data-course-card
		class="card"
		class:titles-only={!plan.showCodes}
		class:noted={creditNote !== null}
		class:dragging={plan.dragging === course.code}
		data-type={type}
		style:--hue={plan.hueOf(course.code)}
		draggable={!mobile && !pending}
		in:courseIn={{ key: course.code }}
		out:courseOut={{ key: course.code }}
		ondragstart={dragstart}
		ondragend={() => (plan.dragging = null)}
		onclick={() => (plan.selected = course)}
		title={pending
			? `${label}, credits awaiting confirmation`
			: mobile
				? `view ${label}`
				: `drag ${label} onto the grid`}
	>
		{#if plan.showCodes}
			<span class="code">
				{#if showReq}<span class="req-dot" role="img" aria-label="required" title="required by your programme"
					></span>{/if}
				{shownCode}
				{#if alsoCodes.length}
					<span class="xlist" title="cross-listed as {alsoCodes.join(', ')}">
						⇄ {xlistShown.join(' · ')}{xlistExtra > 0 ? ` +${xlistExtra}` : ''}
					</span>
				{/if}
			</span>
		{/if}
		<!-- with codes switched off there's no code row, so the dot leads the title -->
		<span class="title"
			>{#if showReq && !plan.showCodes}<span
					class="req-dot"
					role="img"
					aria-label="required"
					title="required by your programme"
				></span>{/if}{course.title}</span
		>
		<!-- with codes off there's no code row to carry the cross-listing,
			     so it gets a line of its own under the title -->
		{#if !plan.showCodes && alsoCodes.length}
			<span class="xlist alone" title="cross-listed as {alsoCodes.join(', ')}">
				⇄ {xlistShown.join(' · ')}{xlistExtra > 0 ? ` +${xlistExtra}` : ''}
			</span>
		{/if}
		{#if !mobile && creditNote}<span
				class="credit-label"
				title={pending ? 'credits to confirm' : `${course.credits} credits`}
				>{pending ? 'TBC' : `${course.credits} cr`}</span
			>{/if}
		{#if mobile}<span class="mobile-meta"
				><span
					>{pending ? 'credits to confirm' : `${course.credits} credits`} · {course.offered
						.map((t) => `T${t}`)
						.join(' / ') || 'term to confirm'}</span
				><span aria-hidden="true">details →</span></span
			>{/if}
	</button>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.credit-label {
		position: absolute;
		top: 0.85rem;
		right: 1rem;
		font-size: 1.1rem;
		line-height: 1.4;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.card {
		position: relative;
		text-align: left;
		font: inherit;
		color: var(--color-text);
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden; // nothing (a long crosslist row) may spill outside
		padding: 0.75rem 1.1rem;
		border-radius: 6px; // a touch rounder, so the shine reads as a curved face
		cursor: grab;
		transition:
			transform 0.15s ease,
			opacity 0.15s ease,
			box-shadow 0.2s ease;
		@include course-type-fill(false);
		box-shadow: var(--shadow-inset);

		&:hover {
			transform: translateY(-1px);
			box-shadow: var(--shadow-inset-hover);
		}

		&:active {
			cursor: grabbing;
		}

		// the source of an in-flight drag fades, so the cursor ghost reads as
		// the course being picked up out of the catalogue
		&.dragging {
			opacity: 0.4;
			transform: scale(0.98);
		}

		&.placed {
			background: transparent;
			// dashed, because dots go fuzzy at 1px
			border: 1px dashed color-mix(in srgb, var(--color-text-muted) 55%, transparent);
			border-radius: 6px;
			padding: 1rem 1.2rem;
			box-shadow: none;
			color: var(--color-text-muted);
			cursor: default;

			&:hover {
				transform: none;
				background: color-mix(in srgb, var(--color-accent) 5%, transparent);
			}

			.credit-label {
				top: 1rem;
				right: 3.6rem;
			}

			.code {
				padding-right: 0;
			}

			// only a card with a credit note gives up room for it
			&.noted .code,
			&.noted.titles-only .title {
				padding-right: 6.5rem;
			}
		}
	}

	.code {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-width: 0;
		max-width: 100%;
		font-size: var(--text-body);
		font-weight: 700;
		width: 100%;
	}

	.card.noted:not(.placed) .code,
	.card.noted.titles-only:not(.placed) > .title {
		padding-right: 3.4rem;
	}

	// the cross-listed departments, lighter weight so the code you're
	// browsing under stays the anchor, but visible so it's obvious it's shared.
	// Ellipsizes rather than pushing past the (often narrow) card edge.
	.xlist {
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 400;
		white-space: nowrap;

		&.alone {
			margin-top: 0.3rem;
		}
	}

	.req-dot {
		@include required-dot;
		align-self: center;

		.title & {
			margin-right: 0.5rem;
			vertical-align: 0.1em;
		}
	}

	// two lines then ellipsis, enough to tell courses apart without letting
	// a long title stretch the card taller than its neighbours
	.title {
		font-size: var(--text-body);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	// a small white key in the corner, so taking a course back looks clickable
	.unplace {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		min-width: 2.2rem;
		height: 2.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		font-size: 1.25rem;
		line-height: 1;
		@include store-button;

		// glossy at rest, sunk in while pressed
		&:active:not(:disabled) {
			box-shadow: var(--shadow-well);
		}
	}
	.placed-open {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		padding: 0;
		padding-right: 2rem;
		font: inherit;
		color: inherit;
		border: 0;
		background: none;
		cursor: pointer;
		width: 100%;
	}
	.mobile-meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding-top: 1rem;
		margin-top: 0.8rem;
		border-top: 1px solid var(--color-border-divider);
		font-size: 1.2rem;
		color: var(--color-text-muted);
	}
	// by finger: the ↩ that lifts a placed course off has a fingertip's reach
	@include touch {
		.card.placed .credit-label {
			right: 4.6rem;
		}
		.placed-open {
			padding-right: 3rem;
		}
		.unplace {
			min-width: 3.6rem;
			height: 3.2rem;
		}
	}
	@include mobile {
		.card.placed .credit-label {
			top: 1rem;
			right: 7.2rem;
		}
		.card {
			padding: 1.6rem;
			border-radius: 1rem;
			cursor: pointer;
		}
		.code {
			font-size: 1.3rem;
		}
		.title {
			font-size: 1.6rem;
			line-height: 1.45;
			margin-top: 0.4rem;
			-webkit-line-clamp: unset;
			line-clamp: unset;
		}
		.placed-open {
			padding-right: 6rem;
			min-height: 4.4rem;
			width: 100%;
		}
		.unplace {
			top: 0.8rem;
			right: 0.8rem;
			min-width: 5.6rem;
			font-size: 1.2rem;
		}
	}
</style>
