<script lang="ts">
	// the first slide's panel: everything a box or a cell can say, each row
	// drawn the way the grid draws it. pointing at a row lights what it means.
	import { usePlan } from '$lib/planner/context';

	const plan = usePlan();

	type Row = { id: string; text: string; codes?: () => string[]; slots?: string[] };

	const ofType = (type: string) => () => [...plan.placedCodes].filter((c) => plan.courseType(c) === type);
	const firstOf = (type: string) => [...plan.placedCodes].find((c) => plan.courseType(c) === type);

	const ROWS: Row[] = [
		{ id: 'year', text: 'each row is a year', slots: ['1-1', '1-2', '1-3'] },
		{ id: 'trim', text: 'each column is a trimester', slots: ['1-2', '2-2'] },
		{ id: 'required', text: 'a dot: required by your programme', codes: ofType('required') },
		{ id: 'elective', text: 'a coloured edge: an elective that counts', codes: ofType('elective') },
		{ id: 'core', text: 'kccs, the foundation everyone takes', codes: ofType('core') },
		{ id: 'other', text: 'another department: counts to the total only', codes: ofType('other') },
		{ id: 'flag', text: 'a broken rule. the hints say which', codes: () => [...plan.flagKinds.keys()] },
		{ id: 'now', text: 'the ring: the trimester you’re in now', slots: ['2-1'] }
	];

	function light(row: Row | null) {
		plan.highlight = row?.codes?.() ?? [];
		plan.highlightSlots = row?.slots ?? [];
	}
</script>

<div class="section">
	<h3>reading the grid</h3>
	<ul>
		{#each ROWS as row (row.id)}
			<li>
				<button
					onmouseenter={() => light(row)}
					onmouseleave={() => light(null)}
					onfocus={() => light(row)}
					onblur={() => light(null)}
				>
					<span class="sample">
						{#if row.id === 'year'}
							<b class="head">y1</b><b class="head">y2</b>
						{:else if row.id === 'trim'}
							<b class="head">t1</b><b class="head">t2</b><b class="head">t3</b>
						{:else if row.id === 'flag'}
							{#each ['warn', 'caution'] as kind (kind)}<i class="flag" data-kind={kind}></i>{/each}
						{:else if row.id === 'now'}
							<i class="now"></i>
						{:else}
							{@const code = firstOf(row.id)}
							<i class="box" data-type={row.id} style:--hue={code ? plan.hueOf(code) : undefined}>
								{#if row.id === 'required'}<i class="dot"></i>{/if}
							</i>
						{/if}
					</span>
					<span class="words">{row.text}</span>
				</button>
			</li>
		{/each}
	</ul>
	<p class="tip">point at a row to find it on the grid</p>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.section {
		@include rail-section;
		border-bottom: 0;
	}

	ul {
		list-style: none;
		padding: 0.8rem 0.8rem 0.8rem;
	}

	.tip {
		padding: 0 1.6rem 1.4rem;
		font-size: 1.2rem;
		color: var(--color-text-muted);
	}

	button {
		display: grid;
		grid-template-columns: 7.4rem minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
		width: 100%;
		min-height: 4.6rem;
		padding: 0.5rem 0.8rem;
		font: inherit;
		text-align: left;
		color: var(--color-text);
		background: none;
		border: 0;
		border-radius: 6px;
		cursor: default;
		transition: background-color 0.15s ease;

		&:hover,
		&:focus-visible {
			background: var(--color-active);
		}
	}

	.words {
		font-size: 1.3rem;
		line-height: 1.35;
	}

	.sample {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.head {
		font-size: 1.5rem;
		font-weight: 400;
	}

	// a course's box, the size of a short chip
	.box {
		display: flex;
		align-items: center;
		width: 5.6rem;
		height: 2.6rem;
		padding: 0 0.7rem;
		border-radius: 5px;
		@include course-type-fill($audits: false);
		@include card-shine;
	}

	.dot {
		@include required-dot;
	}

	.flag {
		@include severity-mark;
		width: 1.2rem;
		height: 1.2rem;
	}

	// the "now" ring, as the cell draws it
	.now {
		width: 5.6rem;
		height: 2.6rem;
		background: var(--color-grid-cell);
		border: 2px solid color-mix(in srgb, var(--color-now) 55%, transparent);
		border-radius: 5px;
	}
</style>
