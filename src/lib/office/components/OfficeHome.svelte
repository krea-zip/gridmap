<script lang="ts">
	// the office's front page: where things stand, the batch coming up and what
	// needs attention. everything else is one key away along the top.
	import { useOffice } from '$lib/office/workspace.svelte';
	import { issueHref } from '$lib/office/navigation';
	import { batchDifferences, batchSummary, nextBatch } from '$lib/office/batches';
	import OfficeIcon from './OfficeIcon.svelte';

	const office = useOffice();
	const doc = $derived(office.document);
	const term = $derived(doc?.terms.find((t) => t.id === office.term));
	const next = nextBatch();
	const summary = $derived(doc && batchSummary(doc, next));
	const differences = $derived(doc ? batchDifferences(doc, next).filter((d) => d.kind !== 'requirements') : []);
	const draftState = $derived(
		office.dirty
			? 'Unsaved changes on this screen'
			: office.status === 'published'
				? 'Same as the published release'
				: 'Saved, not yet published'
	);
	const attention = $derived([...office.errors, ...office.issues.filter((i) => i.severity !== 'error')].slice(0, 5));
</script>

<h1>welcome back, {office.name.split(' ')[0]}</h1>

<div class="office-card office-desk">
	<div>
		<small>Working on</small>
		<b>{term?.label || 'No term selected'}</b>
		<span><a href="/admin/offerings">change term</a></span>
	</div>
	<div>
		<small>Your draft</small>
		<b>{draftState}</b>
		<span>{office.message}</span>
	</div>
	<div>
		<small>Students are seeing</small>
		<b>{office.release ? `Release ${office.release}` : 'The built-in catalogue'}</b>
		<span>{office.deployment || 'No website update requested yet'}</span>
	</div>
	<div>
		<small>What’s next</small>
		<b
			>{office.errors.length
				? `Fix ${office.errors.length} blocking ${office.errors.length === 1 ? 'problem' : 'problems'}`
				: office.dirty
					? 'Save your draft'
					: office.status === 'published'
						? 'Nothing waiting'
						: 'Review and publish'}</b
		>
		<span><a href="/admin/changes">open review & publish</a></span>
	</div>
</div>

<div class="office-stats">
	<a href="/admin/courses">
		<span><OfficeIcon name="book" size={18} /> Active courses</span>
		<b>{doc?.curriculum.courses.filter((c) => !c.retired).length ?? 0}</b>
		<small>Explore the catalogue <span aria-hidden="true">↗</span></small>
	</a>
	<a href="/admin/offerings">
		<span><OfficeIcon name="calendar" size={18} /> Term offerings</span>
		<b>{doc?.offerings.filter((o) => o.term === office.term).length ?? 0}</b>
		<small>{term?.label || 'Select a term'} <span aria-hidden="true">↗</span></small>
	</a>
	<a href="/admin/changes">
		<span><OfficeIcon name="history" size={18} /> Changes since opening</span>
		<b>{office.changes.length}</b>
		<small>See them all <span aria-hidden="true">↗</span></small>
	</a>
	<a href="/admin/changes" class:has-errors={office.errors.length > 0}>
		<span><OfficeIcon name={office.errors.length ? 'warning' : 'check'} size={18} /> Publishing checks</span>
		<b>{office.errors.length || 'All clear'}</b>
		<small
			>{office.errors.length ? 'Items to resolve before publishing' : 'No blocking errors'}
			<span aria-hidden="true">↗</span></small
		>
	</a>
</div>

<div class="office-home-bottom">
	<section class="office-card">
		<div class="office-eyebrow">The next intake</div>
		<h2>{next} batch</h2>
		{#if !differences.some((d) => d.kind === 'curriculum')}<p class="office-help">
				Follows “{summary?.curriculum}”.
			</p>{/if}
		{#if differences.length}
			<ul class="office-attention-list">
				{#each differences.slice(0, 4) as d (d.title)}
					<li><span class="office-issue-dot"></span><span><b>{d.title}</b><span>{d.detail}</span></span></li>
				{/each}
			</ul>
		{:else}
			<p>No changes from the {next - 1} batch yet.</p>
		{/if}
		<a class="button primary" href="/admin/batches/{next}"
			>open the {next} batch <OfficeIcon name="arrow" size={16} /></a
		>
	</section>
	<section class="office-card">
		<div class="office-section-heading">
			<h2>needs attention</h2>
			<span class="office-badge">{office.issues.length}</span>
		</div>
		{#if attention.length}
			<ul class="office-attention-list">
				{#each attention as issue, i (i)}
					<li>
						<span class="office-issue-dot" class:error={issue.severity === 'error'}></span>
						<a href={issueHref(issue.area, issue.record)}
							><b>{issue.record || issue.area}</b><span>{issue.message}</span></a
						>
						<OfficeIcon name="arrow" size={15} />
					</li>
				{/each}
			</ul>
			<a class="office-text-link" href="/admin/changes">see all checks →</a>
		{:else}
			<div class="office-all-clear">
				<OfficeIcon name="check" size={28} /><b>Looking good.</b>
				<p>The draft has no outstanding checks.</p>
			</div>
		{/if}
	</section>
</div>
