<script lang="ts">
	// the academic office's frame: sidebar, toolbar and the page. the draft
	// arrives with the page (see +layout.server.ts); a fresh copy from the
	// server, after a reload or a sign-in, replaces what's on screen.
	import '../../app.scss';
	import './legacy.scss';
	import './admin.scss';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import { beforeNavigate } from '$app/navigation';
	import { Workspace, provideOffice } from '$lib/features/office/workspace.svelte';
	import OfficeNav from '$lib/components/admin/OfficeNav.svelte';
	import OfficeToolbar from '$lib/components/admin/OfficeToolbar.svelte';
	import OfficeSignIn from '$lib/components/admin/OfficeSignIn.svelte';

	let { data, children }: LayoutProps = $props();
	const office = provideOffice(new Workspace());

	$effect.pre(() => {
		if (data.workspace && data.session.state === 'ok') office.load(data.workspace, data.session.role);
	});

	let large = $state(false);
	let signedIn = $derived(data.session.state === 'ok');
	let contributorElsewhere = $derived(
		office.role === 'contributor' && !page.url.pathname.startsWith('/admin/approvals')
	);

	// unsaved edits live only on this screen, so leaving asks first
	beforeNavigate(({ to, cancel, type }) => {
		if (!office.dirty) return;
		if (type === 'leave') return cancel();
		if (to && !to.url.pathname.startsWith('/admin') && !confirm('You have unsaved changes. Leave without saving them?'))
			cancel();
	});
</script>

<svelte:head>
	<title>Academic office · kcal</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="office-shell" class:large-text={large}>
	{#if signedIn}<OfficeNav bind:large />{/if}
	<div class="office-body">
		{#if signedIn}<OfficeToolbar />{/if}
		<main class="office-main adm">
			{#if data.session.state === 'signed-out'}
				<OfficeSignIn />
			{:else if data.session.state === 'no-access'}
				<OfficeSignIn email={data.session.email} />
			{:else if contributorElsewhere}
				<h1>Department submissions</h1>
				<p>Submit course updates to the academic office and follow their review.</p>
				<a class="button primary" href="/admin/approvals">Open department requests</a>
			{:else}
				{@render children()}
			{/if}
		</main>
	</div>
</div>
