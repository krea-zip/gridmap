<script lang="ts">
	// the office's sidebar: the jobs grouped the way the office thinks about
	// them. a contributor only ever sends requests, so sees just that page.
	import { page } from '$app/state';
	import { useOffice } from '$lib/features/office/workspace.svelte';

	let { large = $bindable(false) }: { large?: boolean } = $props();
	const office = useOffice();

	const GROUPS = [
		{
			title: 'Daily work',
			links: [
				['', 'Overview'],
				['import', 'Upload spreadsheet'],
				['offerings', 'Terms & offerings'],
				['approvals', 'Approvals & requests']
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
				['history', 'Change history'],
				['reports', 'Reports & downloads'],
				['settings', 'Office fields'],
				['staff', 'Staff access']
			]
		}
	];

	const here = (path: string) => page.url.pathname.replace(/\/$/, '') === `/admin${path ? '/' + path : ''}`;
	// a contributor only sends requests; only an administrator manages access
	const visible = (path: string) =>
		office.role === 'contributor' ? path === 'approvals' : path !== 'staff' || office.role === 'admin';
</script>

<aside class="office-nav">
	<a class="office-brand" href="/admin">kcal <span>academic office</span></a>
	<nav aria-label="Academic office navigation">
		{#each GROUPS as group (group.title)}
			<h2>{group.title}</h2>
			{#each group.links.filter(([path]) => visible(path)) as [path, label] (path)}
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
