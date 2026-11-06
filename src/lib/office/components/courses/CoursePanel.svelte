<script lang="ts">
	// everything about one course, stacked, sliding in like the planner's own
	// details panel. no tabs: scrolling is simpler than remembering where a
	// field lives.
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { reducedMotion } from '$lib/ui/transitions';
	import type { OfficeCourse } from '$lib/office/model';
	import CourseDetails from './CourseDetails.svelte';
	import CourseListings from './CourseListings.svelte';
	import CoursePrerequisites from './CoursePrerequisites.svelte';
	import CourseTeaching from './CourseTeaching.svelte';

	let { course, onclose }: { course: OfficeCourse; onclose: () => void } = $props();
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose();
	}}
/>

<aside
	class="panel"
	aria-label="{course.code} {course.title}"
	transition:fly={{ x: 48, duration: reducedMotion() ? 0 : 240, easing: cubicOut }}
>
	<header>
		<div>
			<h2>{course.code}</h2>
			<p>{course.title}</p>
		</div>
		<button class="close" aria-label="Close" title="close (esc)" onclick={onclose}>×</button>
	</header>
	<div class="parts">
		{#key course.code}
			<CourseDetails {course} />
			<CoursePrerequisites {course} />
			<CourseListings {course} />
			<CourseTeaching {course} />
		{/key}
	</div>
</aside>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.panel {
		position: fixed;
		top: calc(var(--office-head) + var(--office-bar));
		right: 0;
		bottom: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		width: min(48rem, 50%);
		background: linear-gradient(to bottom, var(--color-bg-warm-start), var(--color-bg-warm-end));
		border-left: 1px solid var(--color-border);
	}

	header {
		display: flex;
		flex-shrink: 0;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background: linear-gradient(to bottom, var(--color-bg-header-start), var(--color-bg-header-end));
		border-bottom: 1px solid var(--color-border);

		h2 {
			margin: 0;
		}

		p {
			margin: 0;
			font-size: 1.3rem;
			color: var(--color-text-muted);
		}
	}

	.close {
		flex: none;
		min-width: 3.4rem;
		padding: 0;
		font-size: 1.8rem;
	}

	.parts {
		flex: 1;
		min-height: 0;
		padding: 0 2rem 3rem;
		overflow: auto;
	}

	// each part on its dotted rule
	.parts > :global(section) {
		padding: 1.6rem 0;
		border-bottom: var(--office-rule);
	}

	.parts > :global(section:last-child) {
		border-bottom: 0;
	}

	@include mobile {
		.panel {
			top: 0;
			z-index: 10;
			width: 100%;
		}
	}
</style>
