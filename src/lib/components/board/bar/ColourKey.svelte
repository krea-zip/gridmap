<script lang="ts">
	// what the chip colours mean, folded into one key. laid out along the bar
	// it read as a row of checkboxes and pushed the credit count onto a line
	// of its own. hovering a row lights its chips, the way hovering a hint does.
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { subjectById } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	import { reducedMotion } from '$lib/ui/transitions';
	import Keys from './Keys.svelte';

	const plan = usePlan();

	const TYPE_KEYS = [
		{ type: 'core', label: 'kccs', note: 'the foundation core every student takes, mostly in year 1' },
		{ type: 'required', label: 'required (filled)', note: 'required by your major, minor or concentration' },
		{ type: 'elective', label: 'elective (outlined)', note: 'an elective that counts toward your programme' },
		{ type: 'other', label: 'other dept.', note: 'counts toward none of your programmes' }
	] as const;

	let root: HTMLDivElement;
	let open = $state(false);
	let subjects = $derived(plan.programmes.map((p, i) => ({ ...p, i })).filter((p) => p.subject !== 'open'));

	// shutting lets go of any chips it had lit
	function setOpen(next: boolean) {
		open = next;
		if (!next) plan.highlight = [];
	}

	const light = (match: (code: string) => boolean) => (plan.highlight = [...plan.placedCodes].filter(match));
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && !root.contains(e.target as Node)) setOpen(false);
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) setOpen(false);
	}}
/>

<!-- the type rows wear the major's hue, the colour you'll see most -->
<div
	class="colour-key"
	bind:this={root}
	style:--hue={plan.programmes[0] && subjectById(plan.programmes[0].subject).hue}
>
	<Keys plain>
		<button class:active={open} aria-expanded={open} aria-controls="colour-key" onclick={() => setOpen(!open)}>
			<!-- just the essentials on its face: a square per subject, then
			     required and elective; kccs and other dept. wait inside -->
			{#if subjects.length}
				<span class="swatches" aria-hidden="true">
					{#each subjects as s (s.role + s.subject)}
						<i data-type="required" style:--hue={subjectById(s.subject).hue}></i>
					{/each}
				</span>
			{/if}
			<span class="swatches" aria-hidden="true"><i data-type="required"></i><i data-type="elective"></i></span>
			colours <span class="caret" aria-hidden="true">▾</span>
		</button>
	</Keys>
	{#if open}
		<div
			id="colour-key"
			class="pop"
			in:scale={{ start: 0.94, duration: reducedMotion() ? 0 : 260, easing: backOut }}
			out:fade={{ duration: reducedMotion() ? 0 : 100 }}
		>
			<ul class="legend" aria-label="course colour legend">
				{#each TYPE_KEYS as k (k.type)}
					<li
						title={k.note}
						onmouseenter={() => light((c) => plan.courseType(c) === k.type)}
						onmouseleave={() => (plan.highlight = [])}
					>
						<i data-type={k.type}
							>{#if k.type === 'required'}<b class="req-dot"></b>{/if}</i
						>{k.label}
					</li>
				{/each}
			</ul>
			<!-- each subject keeps its hue on every plan -->
			{#if subjects.length}
				<ul class="legend" aria-label="subject colour legend">
					{#each subjects as s (s.role + s.subject)}
						<li
							onmouseenter={() => light((c) => plan.programmeOf(c) === s.i)}
							onmouseleave={() => (plan.highlight = [])}
						>
							<i data-type="required" style:--hue={subjectById(s.subject).hue}></i>{subjectById(s.subject).label}<em
								>{s.role}</em
							>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.colour-key {
		position: relative;
	}

	.caret {
		font-size: 1rem;
		transition: transform 260ms var(--spring);
	}

	.active .caret {
		transform: rotate(180deg);
	}

	.swatches {
		display: flex;
		gap: 2px;

		// the subjects' squares and the roles' sit a little apart
		& + & {
			margin-left: -0.2rem;
		}

		// only required and elective appear on the face, so only their fills
		i {
			width: 0.9rem;
			height: 0.9rem;
			border-radius: 2px;

			&[data-type='required'] {
				background: subject-tone(required);
				border: 1px solid subject-tone(required-deep);
			}

			&[data-type='elective'] {
				background: subject-tone(elective);
				border: 1px solid subject-tone(elective-deep);
			}
		}
	}

	.pop {
		position: absolute;
		top: calc(100% + 0.6rem);
		left: 0;
		z-index: 3;
		width: max-content;
		padding: 0.5rem;
		background: var(--color-bg-card-start);
		border: 1px solid var(--bar-edge);
		border-radius: 6px;
		box-shadow: 0 6px 18px rgba(20, 30, 50, 0.18);
		transform-origin: top left;
	}

	// the roles, then a dotted rule, then the subjects
	.legend + .legend {
		margin-top: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px dotted color-mix(in srgb, var(--bar-text-muted) 55%, transparent);
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.5rem 1rem 0.5rem 0.6rem;
		font-size: 1.25rem;
		color: var(--color-text);
		border-radius: 4px;
		cursor: default;

		&:hover {
			background: var(--bar-well);
		}

		// a swatch shaped like the chip it stands for, not a checkbox
		i {
			display: grid;
			place-items: center;
			width: 1.8rem;
			height: 1.1rem;
			border-radius: 3px;
			@include course-type-fill($audits: false);
		}

		em {
			margin-left: -0.3rem;
			font-style: normal;
			color: var(--color-text-muted);
		}
	}

	.req-dot {
		@include required-dot;
		width: 0.5rem;
		height: 0.5rem;
	}

	@include touch {
		li {
			padding: 1rem 1.4rem 1rem 0.8rem;
		}
	}
</style>
