<script lang="ts">
	// the office's sidebar: the jobs grouped the way the office thinks about them
	import { page } from '$app/state';

	let { large = $bindable(false) }: { large?: boolean } = $props();

	const GROUPS = [
		{
			title: 'Daily work',
			links: [
				['', 'Overview'],
				['import', 'Upload spreadsheet'],
				['offerings', 'Terms & offerings']
			]
		},
		{
			title: 'Catalogue',
			links: [
				['courses', 'Courses'],
				['faculty', 'Faculty'],
				['departments', 'Departments'],
				['crosslist', 'Cross-listing & substitutions']
			]
		},
		{
			title: 'Academic rules',
			links: [
				['requirements', 'Degree requirements'],
				['batches', 'Batch requirements'],
				['rules', 'University policies'],
				['tree', 'Prerequisite map']
			]
		},
		{
			title: 'Manage',
			links: [
				['changes', 'Review & publish'],
				['history', 'Past releases'],
				['settings', 'Office fields']
			]
		}
	];

	const here = (path: string) => page.url.pathname.replace(/\/$/, '') === `/admin${path ? '/' + path : ''}`;
</script>

<aside class="office-nav">
	<a class="office-brand" href="/admin">kcal <span>academic office</span></a>
	<nav aria-label="Academic office navigation">
		{#each GROUPS as group (group.title)}
			<h2>{group.title}</h2>
			{#each group.links as [path, label] (path)}
				<a href="/admin{path ? '/' + path : ''}" aria-current={here(path) ? 'page' : undefined}>{label}</a>
			{/each}
		{/each}
	</nav>
	<div class="office-nav-foot">
		<button type="button" aria-pressed={large} onclick={() => (large = !large)}
			>Aa · {large ? 'Standard text' : 'Larger text'}</button
		>
		<a href="/">Student planner ↗</a>
	</div>
</aside>
