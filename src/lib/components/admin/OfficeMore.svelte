<script lang="ts">
	// the pages that don't need a key of their own. the key names the page it's
	// on, so nobody loses their place inside the menu.
	import { page } from '$app/state';
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { OFFICE_MORE, officeHref, officePage } from '$lib/features/office/navigation';
	import { reducedMotion } from '$lib/ui/transitions';
	import Keys from '$lib/components/board/bar/Keys.svelte';
	import OfficeIcon from './OfficeIcon.svelte';

	let root: HTMLDivElement;
	let button = $state<HTMLButtonElement>();
	let open = $state(false);
	const here = $derived(OFFICE_MORE.find((p) => p.path === officePage(page.url.pathname).path));
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && !root.contains(e.target as Node)) open = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) {
			open = false;
			button?.focus();
		}
	}}
/>

<div class="more" bind:this={root}>
	<Keys plain>
		<button
			bind:this={button}
			class:active={open}
			aria-expanded={open}
			aria-controls="office-more"
			onclick={() => (open = !open)}
		>
			{here?.label ?? 'more'} <span class="caret" class:open aria-hidden="true">▾</span>
		</button>
	</Keys>
	{#if open}
		<div class="pop" id="office-more" in:scale={{ start: 0.94, duration: reducedMotion() ? 0 : 260, easing: backOut }}>
			{#each OFFICE_MORE as link (link.path)}
				<a
					href={officeHref(link.path)}
					aria-current={here === link ? 'page' : undefined}
					onclick={() => (open = false)}
				>
					<OfficeIcon name={link.icon} size={18} />
					<span><b>{link.label}</b><small>{link.detail}</small></span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.more {
		position: relative;
		flex: none;
	}

	.caret {
		display: inline-block;
		font-size: 1rem;
		transition: transform 260ms var(--spring);

		&.open {
			transform: rotate(180deg);
		}
	}

	.pop {
		position: absolute;
		top: calc(100% + 0.6rem);
		left: 0;
		z-index: 5;
		width: 30rem;
		padding: 0.5rem;
		background: var(--color-bg-card-start);
		border: 1px solid var(--bar-edge);
		border-radius: 6px;
		box-shadow: 0 6px 18px rgba(20, 40, 70, 0.18);
		transform-origin: top left;
	}

	a {
		display: flex;
		gap: 1rem;
		align-items: center;
		padding: 0.6rem 0.7rem;
		color: var(--color-text);
		text-decoration: none;
		border-radius: 4px;

		&:hover,
		&[aria-current='page'] {
			background: var(--color-subtle);
		}
	}

	a :global(svg) {
		flex-shrink: 0;
		color: var(--color-accent);
	}

	b,
	small {
		display: block;
	}

	b {
		font-size: 1.3rem;
		font-weight: 600;
	}
</style>
