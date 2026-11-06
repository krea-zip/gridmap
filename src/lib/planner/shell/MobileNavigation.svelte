<script lang="ts">
	import PixelIcon from '$lib/ui/PixelIcon.svelte';

	// the phone's tabs. no header above the panels: each tab starts with its
	// own content, and the credits already show in the board bar
	let { view = $bindable('catalogue') }: { view?: 'catalogue' | 'board' | 'rail' } = $props();
	const tabs = [
		{ id: 'catalogue', label: 'catalogue', icon: 'search' },
		{ id: 'board', label: 'your plan', icon: 'grade' },
		{ id: 'rail', label: 'your degree', icon: 'gear' }
	] as const;
</script>

<nav aria-label="main navigation">
	{#each tabs as tab (tab.id)}
		<button aria-current={view === tab.id ? 'page' : undefined} onclick={() => (view = tab.id)}>
			<PixelIcon name={tab.icon} size="1.6rem" />
			<span>{tab.label}</span>
		</button>
	{/each}
</nav>

<style lang="scss">
	@use '$lib/styles/mixins' as *;
	nav {
		display: none;
	}
	@include mobile {
		nav {
			grid-area: tabs;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.6rem;
			padding: 0.4rem max(1.2rem, env(safe-area-inset-right)) calc(0.4rem + env(safe-area-inset-bottom))
				max(1.2rem, env(safe-area-inset-left));
			background: var(--color-bg-sidebar);
			border-top: 1px solid var(--color-border-warm);
			button {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				gap: 0.2rem;
				min-height: 4.4rem;
				padding: 0.3rem;
				font: inherit;
				font-size: 1.1rem;
				font-weight: 600;
				color: var(--color-text-muted);
				background: transparent;
				border: 1px solid transparent;
				border-radius: 1rem;
				cursor: pointer;
			}
			button[aria-current] {
				color: var(--color-accent);
				background: var(--color-bg-light);
				border-color: var(--color-border-card);
				box-shadow: var(--shadow-inset);
			}
		}
	}
</style>
