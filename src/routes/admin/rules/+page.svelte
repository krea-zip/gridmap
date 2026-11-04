<script lang="ts">
	// university policies: the drop-form numbers every planner hint answers
	// to, and the academic standing rules (cgpa floors, audits, grade points).
	// they change year to year, so the office edits them in the draft and
	// they reach students on the next publish.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { RULE_GROUPS, RULE_INFO } from '$lib/features/office/policies';

	const office = useOffice();
	const curriculum = $derived(office.document?.curriculum);
	const rules = $derived(curriculum?.rules);
	const policies = $derived(curriculum?.policies);
	const issues = $derived(office.issues.filter((i) => i.area === 'Policies'));

	// lists edited as one comma-separated line
	const list = (v: (string | number)[]) => v.join(', ');
	const parts = (s: string) => s.split(/[,\s]+/).filter(Boolean);
</script>

<h1>University policies</h1>
<p class="office-lead">
	The numbers from the drop-form guidelines and the academic regulations. Every hint students see, the credit panel and
	the planner’s colours follow them from the next publish.
</p>

{#if issues.length}
	<div class="office-alert" role="alert">
		<ul>
			{#each issues as issue, i (i)}<li>{issue.message}</li>{/each}
		</ul>
	</div>
{/if}

{#if rules && policies}
	{#each RULE_GROUPS as group (group.title)}
		<section class="office-card">
			<h2>{group.title}</h2>
			<p class="office-help">{group.note}</p>
			<div class="office-form">
				{#each group.keys as key (key)}
					{@const info = RULE_INFO[key]}
					<label>
						{info.label}
						<span class="office-help">{info.help}</span>
						<input type="number" min="0" max={info.max} bind:value={rules[key]} />
					</label>
				{/each}
			</div>
		</section>
	{/each}

	<!-- one trimester drawn a credit per cell, so the four load lines can be
	     checked at a glance -->
	<section class="office-card">
		<h2>One trimester at these numbers</h2>
		<div class="scale" aria-hidden="true">
			{#each { length: 24 } as _, i (i)}
				<span
					class:low={i < rules.TRIM_MIN}
					class:heavy={i >= rules.TRIM_NORMAL_MAX && i < rules.TRIM_HARD_MAX}
					class:over={i >= rules.TRIM_HARD_MAX}>{i + 1}</span
				>
			{/each}
		</div>
		<p class="office-help">
			<i class="key low"></i>under the minimum <i class="key"></i>normal <i class="key heavy"></i>heavy
			<i class="key over"></i>over the cap
		</p>
	</section>

	<section class="office-card">
		<h2>Grades and standing</h2>
		<div class="office-form">
			<label
				>CGPA to graduate<input type="number" step="0.1" min="0" max="10" bind:value={policies.graduationCgpa} /></label
			>
			<label
				>CGPA to keep financial aid<input
					type="number"
					step="0.1"
					min="0"
					max="10"
					bind:value={policies.aidCgpa}
				/></label
			>
			<label
				>CGPA for an exit award<input type="number" step="0.1" min="0" max="10" bind:value={policies.exitCgpa} /></label
			>
			<label
				>Foundation courses per trimester (year 1)<input
					type="number"
					min="0"
					max="12"
					bind:value={policies.foundationMax}
				/></label
			>
			<label
				>Course sizes that can be audited <span class="office-help">credits, comma-separated</span>
				<input
					value={list(policies.auditCredits)}
					onchange={(e) => (policies.auditCredits = parts(e.currentTarget.value).map(Number).filter(Number.isFinite))}
				/></label
			>
			<label
				>Never auditable <span class="office-help">course numbers, e.g. 391, 490</span>
				<input
					value={list(policies.auditExcluded)}
					onchange={(e) => (policies.auditExcluded = parts(e.currentTarget.value))}
				/></label
			>
		</div>
	</section>

	<section class="office-card">
		<h2>Grade points</h2>
		<div class="office-form grades">
			{#each Object.keys(policies.gradePoints) as grade (grade)}
				<label
					>{grade}<input
						type="number"
						step="0.1"
						min="0"
						max="10"
						bind:value={policies.gradePoints[grade]}
						disabled={grade === 'U'}
					/></label
				>
			{/each}
		</div>
		<p class="office-help">A U always carries zero points.</p>
	</section>

	<section class="office-card">
		<h2>Where these come from</h2>
		<div class="office-form">
			<label>Effective from<input type="date" bind:value={policies.effectiveFrom} /></label>
			<label
				>Reference <span class="office-help">the regulation or circular</span><input
					bind:value={policies.reference}
				/></label
			>
			<label class="wide">Notes<textarea rows="3" bind:value={policies.notes}></textarea></label>
		</div>
	</section>
{/if}

<style>
	.scale {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		gap: 2px;
		margin: 0.8rem 0;
	}

	.scale span,
	.key {
		display: grid;
		place-items: center;
		font-size: 1.1rem;
		font-style: normal;
		background: color-mix(in srgb, var(--color-hint-good) 70%, transparent);
		border-radius: 3px;
	}

	.scale span {
		height: 2.8rem;
	}

	.key {
		display: inline-block;
		width: 1.2rem;
		height: 1.2rem;
		margin: 0 0.4rem 0 1rem;
		vertical-align: -0.1rem;
	}

	.low {
		background: var(--color-hint-caution);
	}

	.heavy {
		background: repeating-linear-gradient(
			-45deg,
			var(--color-hint-caution) 0 3px,
			color-mix(in srgb, var(--color-hint-good) 70%, transparent) 3px 6px
		);
	}

	.over {
		background: var(--color-hint-warn);
	}

	.grades {
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
	}
</style>
