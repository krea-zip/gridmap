<script lang="ts">
	// The planner's shell: one plan, shared through context, and one CSS grid
	// of four named areas, sidebar | catalogue | board | details, at 1 : 1 : 3 : 1
	// of the window until a column edge is dragged. The page fills the board.
	//
	// Narrower windows keep the columns but slide the details (tablets), then
	// the sidebar too (an iPad held upright), in over the board; phones show one
	// panel at a time behind tabs.
	import type { Snippet } from 'svelte';
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Plan } from '$lib/plan.svelte';
	import { providePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { plannerKeys } from '$lib/planner/shortcuts';
	import { takeIncoming, arrivedWithSomething, type Incoming } from '$lib/planner/incoming';
	import { focusScope } from '$lib/focusScope';
	import { dragMotion } from '$lib/dragMotion';
	import { touchDrag } from '$lib/touchDrag';
	import { hasCode } from '$lib/data';
	import { loadDescriptions } from '$lib/descriptions.svelte';
	import PanelResizers, { type Panel, type PanelWidths } from '$lib/components/layout/PanelResizers.svelte';
	import MobileNavigation from '$lib/components/layout/MobileNavigation.svelte';
	import Onboarding from '$lib/components/layout/Onboarding.svelte';
	import Flash from '$lib/components/layout/Flash.svelte';
	import PixelIcon from '$lib/components/PixelIcon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FeedbackForm from '$lib/components/FeedbackForm.svelte';
	import CanvasImportPanel from '$lib/components/CanvasImport.svelte';
	import SharedPlanPrompt from '$lib/features/plans/SharedPlanPrompt.svelte';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import HintsPanel from '$lib/components/sidebar/HintsPanel.svelte';
	import Catalogue from '$lib/components/catalogue/Catalogue.svelte';
	import DetailsPanel from '$lib/components/details/DetailsPanel.svelte';

	let { children }: { children: Snippet } = $props();

	const plan = providePlan(new Plan());
	const onKeys = plannerKeys(plan);

	let ready = $state(false);
	let incoming = $state<Incoming | null>(null);
	let tour = $state(false);
	let canvasOpen = $state(false);
	let mobileView = $state<'catalogue' | 'board' | 'rail'>('catalogue');
	let widths = $state<PanelWidths>({});
	let resizing = $state<Panel | null>(null);
	let detailsEl = $state<HTMLElement>();

	// a panel slid in over the others holds the focus until it's closed
	let overlayDetails = $derived((!viewport.desktop || viewport.detailsSlide) && !!plan.selected);
	let overlayRail = $derived(viewport.railSlide && plan.railOpen);

	// opening a course's details puts the sidebar away, and starts them at the top
	$effect(() => {
		if (!plan.selected) return;
		plan.railOpen = false;
		if (overlayDetails) detailsEl?.scrollTo({ top: 0 });
	});
	// the sidebar only slides in where it's folded to its strip
	$effect(() => {
		if (!viewport.railSlide) plan.railOpen = false;
	});

	onMount(() => {
		incoming = takeIncoming();
		if (incoming.course && hasCode(incoming.course)) plan.revealCourse(incoming.course);
		ready = true;
		void tick().then(() => plan.startHistory());

		// the catalogue prose is its own chunk so it can't hold up first paint,
		// pull it in once the planner is up and the browser has a spare moment
		if ('requestIdleCallback' in window) {
			const id = requestIdleCallback(() => loadDescriptions());
			return () => cancelIdleCallback(id);
		}
		const id = setTimeout(loadDescriptions, 400);
		return () => clearTimeout(id);
	});

	function closeOverlays() {
		plan.selected = null;
		plan.railOpen = false;
	}

	// what each column may be interacted with: everything on a laptop, the
	// tab in view on a phone, and nothing beneath a slid-in panel
	const covered = (tab: typeof mobileView) =>
		viewport.desktop ? overlayDetails || (tab !== 'rail' && overlayRail) : mobileView !== tab || overlayDetails;
</script>

<svelte:head>
	<title>kcal</title>
</svelte:head>

<svelte:window onkeydown={onKeys} />

{#if ready}
	<SharedPlanPrompt encoded={incoming?.sharedPlan ?? null} />
	<Onboarding bind:tour skip={!!incoming && arrivedWithSomething(incoming)} />
{/if}

<div
	class="app"
	data-ready={ready}
	data-layout={viewport.desktop ? 'desktop' : 'phone'}
	data-mobile-view={mobileView}
	inert={!ready}
	class:resizing
	class:details-open={!!plan.selected}
	class:rail-open={plan.railOpen}
	use:dragMotion
	use:touchDrag
	style:--rail-w={widths.rail && `${widths.rail}rem`}
	style:--catalogue-w={widths.catalogue && `${widths.catalogue}rem`}
	style:--details-w={widths.details && `${widths.details}rem`}
>
	<MobileNavigation bind:view={mobileView} credits={plan.totalPlacedCredits} />
	<PanelResizers bind:widths bind:resizing />

	<!-- where the sidebar doesn't fit (an iPad held upright) it folds to this
	     strip at the left edge, and slides back in over the catalogue -->
	<div class="rail-strip">
		<button aria-expanded={plan.railOpen} aria-controls="rail" onclick={() => (plan.railOpen = !plan.railOpen)}>
			<PixelIcon name="gear" />
			<span>your degree</span>
		</button>
	</div>

	<!-- a tap beside a slid-in panel puts it away -->
	{#if viewport.desktop && (overlayDetails || overlayRail)}
		<button class="scrim" tabindex="-1" aria-label="close" onclick={closeOverlays} transition:fade={{ duration: 160 }}
		></button>
	{/if}

	<aside
		id="rail"
		class="rail"
		data-panel="rail"
		use:focusScope={overlayRail}
		inert={viewport.desktop ? overlayDetails || (viewport.railSlide && !plan.railOpen) : covered('rail')}
	>
		<Sidebar ontour={() => (tour = true)} onimport={() => (canvasOpen = true)} />
		<HintsPanel />
	</aside>

	<div class="catalogue" data-panel="catalogue" inert={covered('catalogue')}>
		<Catalogue mobile={!viewport.desktop} />
	</div>

	<main class="board" inert={covered('board')}>
		{@render children()}
	</main>

	<!-- a fixed column, so picking a course never shoves a panel over the board -->
	<aside
		class="details"
		data-panel="details"
		data-tour="details"
		aria-label="course details"
		bind:this={detailsEl}
		use:focusScope={overlayDetails}
		inert={(!viewport.desktop || viewport.detailsSlide) && !plan.selected}
	>
		<DetailsPanel />
	</aside>
</div>

<Flash />

{#if plan.feedbackDraft !== null}
	<Modal title="feedback" onclose={() => (plan.feedbackDraft = null)}>
		<FeedbackForm prefill={plan.feedbackDraft} onsent={() => (plan.feedbackDraft = null)} />
	</Modal>
{/if}

<CanvasImportPanel
	bind:open={canvasOpen}
	initial={incoming?.canvas ?? null}
	initialError={incoming?.canvasError ?? ''}
/>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	:global(html),
	:global(body) {
		height: 100%;
	}

	// The app is locked to the viewport and each column scrolls on its own, so
	// nothing ever runs past the page. Each side column takes one share of the
	// window and the board three (320 / 320 / 960 / 320 px on a 1920 laptop),
	// never below its floor; a dragged edge pins that column to a width.
	.app {
		--rail-w: minmax(22rem, 1fr);
		--catalogue-w: minmax(24rem, 1fr);
		--details-w: minmax(26rem, 1fr);
		--board-w: minmax(48rem, 3fr);
		--rail-strip-w: 5.2rem;
		position: relative;
		display: grid;
		grid-template-areas: 'rail catalogue board details';
		grid-template-columns: var(--rail-w) var(--catalogue-w) var(--board-w) var(--details-w);
		height: 100dvh;
		background: var(--color-bg);

		// mid-drag, the cursor holds wherever it wanders and no text gets
		// selected on the way
		&.resizing {
			cursor: col-resize;
			user-select: none;
		}
	}

	.rail,
	.catalogue,
	.board,
	.details {
		min-width: 0;
		min-height: 0;
	}

	.rail {
		--rail-radius: 4px;
		grid-area: rail;
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--color-border-warm);
		overflow-y: auto;
	}

	.catalogue {
		grid-area: catalogue;
		overflow: hidden;
	}

	// the middle column is its own cool zone, a very pale blue-grey field
	.board {
		grid-area: board;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		background: var(--color-bg-board-page);
	}

	.details {
		grid-area: details;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		background: linear-gradient(to bottom, var(--color-bg-sidebar), var(--color-bg-sidebar-end));
		border-left: 1px solid var(--color-border-warm);
	}

	// the folded sidebar's strip, only where the sidebar doesn't fit
	.rail-strip {
		grid-area: strip;
		display: none;
		min-height: 0;
		background: linear-gradient(to bottom, var(--color-bg-sidebar), var(--color-bg-sidebar-end));
		border-right: 1px solid var(--color-border-warm);

		button {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1rem;
			width: 100%;
			padding: 1.6rem 0;
			font: inherit;
			font-size: 1.3rem;
			font-weight: 600;
			color: var(--color-text-muted);
			background: none;
			border: 0;
			cursor: pointer;

			&:hover,
			&[aria-expanded='true'] {
				color: var(--color-accent);
			}

			span {
				writing-mode: vertical-rl;
				transform: rotate(180deg);
			}
		}
	}

	// behind a slid-in panel: a faint dim to tap on to put it away
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 29;
		padding: 0;
		background: rgba(20, 30, 50, 0.14);
		border: 0;
		cursor: default;
	}

	// a panel that slides in over the board
	@mixin slide-in($from) {
		position: fixed;
		top: 0;
		bottom: 0;
		#{$from}: 0;
		z-index: 30;
		visibility: hidden;
		transition:
			transform 0.3s var(--ease-out),
			visibility 0s 0.3s;
	}
	@mixin slid-in {
		transform: none;
		visibility: visible;
		transition: transform 0.34s var(--ease-out);
	}

	// Tablets: the columns, less the details, which slide in from the right
	// over the board when a course is picked, and back out after
	@include details-overlay {
		.app {
			grid-template-areas: 'rail catalogue board';
			grid-template-columns: var(--rail-w) var(--catalogue-w) var(--board-w);
		}

		.details {
			@include slide-in(right);
			width: min(36rem, 90vw);
			padding-right: env(safe-area-inset-right);
			box-shadow: -10px 0 30px rgba(20, 30, 50, 0.18);
			transform: translateX(100%);
		}

		.details-open .details {
			@include slid-in;
		}
	}

	// …and an iPad held upright: the sidebar folds to its strip and slides in
	// from the left the same way
	@include rail-overlay {
		.app {
			grid-template-areas: 'strip catalogue board';
			grid-template-columns: var(--rail-strip-w) var(--catalogue-w) minmax(0, 3fr);
		}

		.rail-strip {
			display: block;
		}

		.rail {
			@include slide-in(left);
			width: min(30rem, 90vw);
			padding-left: env(safe-area-inset-left);
			background: var(--color-bg);
			box-shadow: 10px 0 30px rgba(20, 30, 50, 0.18);
			transform: translateX(-100%);
		}

		.rail-open .rail {
			@include slid-in;
		}
	}

	// Phones: one panel at a time under the tabs, the details over everything
	@include mobile {
		.app {
			grid-template-areas: 'top' 'main' 'tabs';
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto minmax(0, 1fr) auto;
			overflow: hidden;
		}

		.catalogue {
			container: catalogue / inline-size;
		}

		.board {
			container: plan / inline-size;
		}

		.rail,
		.board,
		.catalogue {
			grid-area: main;
			border: 0;
		}

		.app:not([data-mobile-view='rail']) .rail,
		.app:not([data-mobile-view='board']) .board,
		.app:not([data-mobile-view='catalogue']) .catalogue {
			display: none;
		}

		.details {
			display: none;
			position: fixed;
			inset: 0;
			z-index: 30;
			padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
			overscroll-behavior: contain;
			border: 0;
		}

		.details-open .details {
			display: flex;
		}
	}
</style>
