<script lang="ts">
	// what the chip colours mean, folded into one key. laid out along the bar
	// it read as a row of checkboxes and pushed the credit count onto a line
	// of its own. hovering a row lights its chips, the way hovering a hint does;
	// clicking pins them, and the foot offers to drop whatever's pinned.
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { subjectById } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	import { reducedMotion } from '$lib/ui/transitions';
	import Keys from './Keys.svelte';
	import { armed } from '../grid/armed.svelte';

	const plan = usePlan();

	const TYPE_KEYS = [
		{
			type: 'core',
			label: 'kccs',
			noun: 'kccs course',
			note: 'the foundation core every student takes, mostly in year 1'
		},
		{
			type: 'required',
			label: 'required (filled)',
			noun: 'required course',
			note: 'required by your major, minor or concentration'
		},
		{
			type: 'elective',
			label: 'elective (outlined)',
			noun: 'elective',
			note: 'an elective that counts toward your programme'
		},
		{ type: 'other', label: 'other dept.', noun: 'other-dept. course', note: 'counts toward none of your programmes' }
	] as const;

	type Row = { id: string; noun: string; match: (code: string) => boolean };

	let root: HTMLDivElement;
	let open = $state(false);
	let subjects = $derived(plan.programmes.map((p, i) => ({ ...p, i })).filter((p) => p.subject !== 'open'));

	let rows = $derived<Row[]>([
		...TYPE_KEYS.map((k) => ({ id: k.type, noun: k.noun, match: (c: string) => plan.courseType(c) === k.type })),
		...subjects.map((s) => ({
			id: `${s.role}:${s.subject}`,
			noun: `${subjectById(s.subject).label} course`,
			match: (c: string) => plan.programmeOf(c) === s.i
		}))
	]);

	// picked rows, by id; ids outlive a programme being swapped out, so look
	// them up against the live rows rather than holding the rows themselves
	let picked = $state<string[]>([]);
	let hovered = $state<string | null>(null);
	let pickedRows = $derived(rows.filter((r) => picked.includes(r.id)));
	let pickedCodes = $derived([...plan.placedCodes].filter((c) => pickedRows.some((r) => r.match(c))));

	// kccs and required take real work to put back, so those ask twice
	let risky = $derived(pickedCodes.some((c) => ['core', 'required'].includes(plan.courseType(c))));
	let dropLabel = $derived.by(() => {
		const n = pickedCodes.length;
		const noun = pickedRows.length === 1 ? pickedRows[0].noun : 'course';
		return `${n} ${noun}${n === 1 ? '' : 's'}`;
	});

	// what's lit: the pinned rows, plus whichever one the pointer is over
	$effect(() => {
		if (!open) return;
		const hover = rows.find((r) => r.id === hovered);
		plan.highlight = hover ? [...new Set([...pickedCodes, ...[...plan.placedCodes].filter(hover.match)])] : pickedCodes;
	});

	// shutting lets go of any chips it had lit
	function setOpen(next: boolean) {
		open = next;
		if (!next) {
			picked = [];
			hovered = null;
			plan.highlight = [];
		}
	}

	const toggle = (id: string) => (picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);

	function dropPicked() {
		plan.removeCourses(pickedCodes, `removed ${dropLabel}`);
		picked = [];
	}
	const confirmDrop = armed(dropPicked);
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
<div class="colour-key" bind:this={root} style:--hue={plan.programmes[0] && plan.hueFor(plan.programmes[0].subject)}>
	<Keys plain>
		<button class:active={open} aria-expanded={open} aria-controls="colour-key" onclick={() => setOpen(!open)}>
			<!-- just the essentials on its face: a square per subject, then
			     required and elective; kccs and other dept. wait inside -->
			{#if subjects.length}
				<span class="swatches" aria-hidden="true">
					{#each subjects as s (s.role + s.subject)}
						<i data-type="required" style:--hue={plan.hueFor(s.subject)}></i>
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
					<li>
						<button
							title={k.note}
							aria-pressed={picked.includes(k.type)}
							onclick={() => toggle(k.type)}
							onmouseenter={() => (hovered = k.type)}
							onmouseleave={() => (hovered = null)}
						>
							<i data-type={k.type}
								>{#if k.type === 'required'}<b class="req-dot"></b>{/if}</i
							>{k.label}
						</button>
					</li>
				{/each}
			</ul>
			<!-- each subject keeps its hue on every plan -->
			{#if subjects.length}
				<ul class="legend" aria-label="subject colour legend">
					{#each subjects as s (s.role + s.subject)}
						{@const id = `${s.role}:${s.subject}`}
						<li>
							<button
								aria-pressed={picked.includes(id)}
								onclick={() => toggle(id)}
								onmouseenter={() => (hovered = id)}
								onmouseleave={() => (hovered = null)}
							>
								<i data-type="required" style:--hue={plan.hueFor(s.subject)}></i>{subjectById(s.subject).label}<em
									>{s.role}</em
								>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if pickedCodes.length}
				<div class="foot" transition:fade={{ duration: reducedMotion() ? 0 : 120 }}>
					<button
						class="drop"
						class:confirming={risky && confirmDrop.armed}
						title="take every lit course off the grid"
						onclick={() => (risky ? confirmDrop.press() : dropPicked())}
						>{risky && confirmDrop.armed ? 'sure? click again' : `− drop ${dropLabel}`}</button
					>
				</div>
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

	.legend {
		list-style: none;
	}

	// the roles, then a dotted rule, then the subjects
	.legend + .legend {
		margin-top: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px dotted color-mix(in srgb, var(--bar-text-muted) 55%, transparent);
	}

	li > button {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		width: 100%;
		padding: 0.5rem 1rem 0.5rem 0.6rem;
		font: inherit;
		font-size: 1.25rem;
		color: var(--color-text);
		text-align: left;
		background: none;
		border: 0;
		border-radius: 4px;
		cursor: pointer;

		&:hover {
			background: var(--bar-well);
		}

		// pinned: an accent-tinted, ringed row with a tick, so it can't be
		// mistaken for the grey of a plain hover
		&[aria-pressed='true'] {
			font-weight: 600;
			background: color-mix(in srgb, var(--color-accent) 14%, var(--color-bg-card-start));
			box-shadow:
				inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 55%, transparent),
				var(--shadow-inset);

			&::after {
				content: '✓';
				margin-left: auto;
				padding-left: 0.8rem;
				color: var(--color-accent);
			}
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

	// the drop sits under its own dotted rule, like the subjects do
	.foot {
		margin-top: 0.4rem;
		padding-top: 0.6rem;
		border-top: 1px dotted color-mix(in srgb, var(--bar-text-muted) 55%, transparent);
	}

	.drop {
		width: 100%;
		min-height: 3.2rem;
		padding: 0.5rem 1.2rem;
		font: inherit;
		font-size: 1.25rem;
		@include store-button($armable: true);
	}

	.req-dot {
		@include required-dot;
		width: 0.5rem;
		height: 0.5rem;
	}

	@include touch {
		li > button {
			padding: 1rem 1.4rem 1rem 0.8rem;
		}
	}

	// a phone's bar scrolls sideways, so the menu can't hang off its key
	// there: it opens full width under the bar, against the board
	@include mobile {
		.colour-key {
			position: static;
		}

		.pop {
			top: auto;
			left: 1.6rem;
			right: 1.6rem;
			width: auto;
			min-width: 0;
			margin-top: 0.6rem;
		}
	}
</style>
