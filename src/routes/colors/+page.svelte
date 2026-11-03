<script lang="ts">
	// every subject's colour round the wheel, drawn with the planner's own
	// chip styles: a required chip, an elective one, and a trimester tinted by
	// it. neighbours are 15° apart, too close to tell apart on one plan, so
	// the second list shows how a plan that has both keeps them apart
	// (planner/hues.ts). no one else's colours change.
	import { SUBJECTS } from '$lib/curriculum/data';
	import { distinctHues } from '$lib/planner/hues';

	const wheel = SUBJECTS.filter((s) => s.hue !== undefined).sort((a, b) => a.hue! - b.hue!);
	const hueOf = (id: string) => SUBJECTS.find((s) => s.id === id)?.hue;
	const neighbours = wheel.slice(1).map((b, i) => {
		const a = wheel[i];
		return { a, b, moved: distinctHues([a.id, b.id], hueOf).get(b.id)! };
	});
</script>

<svelte:head>
	<title>colours · kcal</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet chip(label: string, hue: number | undefined, type: string)}
	<span class="chip" data-type={type} style:--hue={hue}>
		{#if type === 'required'}<i class="dot"></i>{/if}{label}
	</span>
{/snippet}

<div class="page">
	<main>
		<h1>kcal colours</h1>
		<p>Each subject keeps one hue on every plan. Required courses are filled, electives a step paler.</p>

		<ul class="wheel">
			<li>
				<b>foundation core</b><span class="deg">kccs</span>
				{@render chip('KCCS101', undefined, 'core')}
				<span></span>
				<span class="cell core"></span>
			</li>
			{#each wheel as s (s.id)}
				<li>
					<b>{s.label}</b><span class="deg">{s.hue}°</span>
					{@render chip(`${s.short.toUpperCase()}201`, s.hue, 'required')}
					{@render chip(`${s.short.toUpperCase()}301`, s.hue, 'elective')}
					<span class="cell" style:--hue={s.hue}></span>
				</li>
			{/each}
			<li>
				<b>other departments</b><span class="deg">—</span>
				{@render chip('COURSE', undefined, 'other')}
			</li>
		</ul>

		<h2>Neighbours on one plan</h2>
		<p>When a plan has two subjects next to each other, the second shifts just enough to tell them apart.</p>
		<ul class="pairs">
			{#each neighbours as { a, b, moved } (a.id + b.id)}
				<li>
					<span class="names">{a.label} + {b.label}</span>
					{@render chip(a.short, a.hue, 'required')}
					{@render chip(b.short, b.hue, 'required')}
					<span class="arrow">→</span>
					{@render chip(a.short, a.hue, 'required')}
					{@render chip(b.short, moved, 'required')}
					<span class="deg">{b.short} {b.hue}° → {moved}°</span>
				</li>
			{/each}
		</ul>
	</main>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	main {
		max-width: 96rem;
		margin: 0 auto;
		padding: 3.2rem 1.6rem 6rem;
		font-size: 1.4rem;
		color: var(--color-text);
	}

	// the board's own cool field, so the chips sit on what they sit on
	.page {
		min-height: 100%;
		background: var(--color-bg-board-page);
	}

	h1 {
		font-size: 2.8rem;
	}

	h2 {
		margin-top: 3.2rem;
		font-size: 2rem;
	}

	p {
		margin: 0.6rem 0 1.6rem;
		color: var(--color-text-muted);
	}

	ul {
		display: grid;
		gap: 0.8rem;
		padding: 0;
		list-style: none;
	}

	.wheel li {
		display: grid;
		grid-template-columns: 18rem 5rem 14rem 14rem 1fr;
		align-items: center;
		gap: 1.2rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px dotted var(--color-border-light);
	}

	.pairs li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem;
	}

	.names {
		width: 30rem;
		font-weight: 600;
	}

	.deg,
	.arrow {
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	// the planner's own chip: fill, edge and ink all from course-type-fill
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		width: fit-content;
		padding: 0.7rem 1.2rem;
		font-size: 1.3rem;
		font-weight: 650;
		border-radius: 5px;
		@include course-type-fill($audits: false); // no audited courses here
		@include card-shine;
	}

	.dot {
		@include required-dot;
	}

	// a trimester holding only this subject's courses
	.cell {
		height: 3.6rem;
		border-radius: 8px;
		background: oklch(var(--tone-cell-l) var(--tone-cell-c) var(--hue));
		outline: 1px dashed color-mix(in srgb, var(--color-board-text) 35%, transparent);
		outline-offset: -4px;

		&.core {
			background: color-mix(in oklab, var(--color-course-core) 45%, var(--color-grid-cell));
		}
	}

	@media (max-width: 720px) {
		.wheel li {
			grid-template-columns: 1fr auto;
		}

		.cell {
			grid-column: 1 / -1;
		}

		.names {
			width: 100%;
		}
	}
</style>
