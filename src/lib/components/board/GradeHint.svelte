<script lang="ts">
	// grade view changes what the whole board means (credits become TGPA,
	// chips take a mark), so its first visit says so, once
	import { fly } from 'svelte/transition';
	import { useBoard } from './boardState.svelte';

	const board = useBoard();
</script>

{#if board.gradeHint}
	<div class="grade-hint" transition:fly={{ y: -8, duration: 180 }}>
		<button class="close" onclick={() => board.dismissGradeHint()} aria-label="dismiss">×</button>
		<strong>grades view</strong>
		<ul>
			<li>click a course on the grid, then set its <b>grade</b> in the course panel on the right</li>
			<li>each trimester shows its <b>TGPA</b> instead of credits; the button above shows your <b>CGPA</b></li>
			<li>open <b>CGPA</b> for the full breakdown and what you'd need to pull an average back up</li>
			<li><b>audits</b> carry no grade and stay out of the maths</li>
		</ul>
		<button class="go" onclick={() => board.dismissGradeHint()}>got it</button>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.grade-hint {
		position: relative;
		margin: 1.6rem var(--board-gutter, 3.2rem) 0;
		padding: 1.2rem 3rem 1.4rem 1.6rem;
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-light));
		border: 1px solid var(--color-control);
		border-radius: 6px;
	}

	strong {
		display: block;
		font-size: 1.35rem;
		color: var(--color-text);
	}

	ul {
		margin-top: 0.5rem;
		padding-left: 1.6rem;
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	li {
		list-style: disc;
	}

	b {
		font-weight: 600;
		color: var(--color-text);
	}

	.close {
		position: absolute;
		top: 0.3rem;
		right: 0.5rem;
		padding: 0.2rem 0.5rem;
		font-size: 1.6rem;
		line-height: 1;
		color: var(--color-text-muted);
		background: none;
		border: none;
		cursor: pointer;

		&:hover {
			color: var(--color-text);
		}
	}

	.go {
		margin-top: 1rem;
		padding: 0.5rem 1.6rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border: 1px solid var(--color-control-deep);
		border-radius: 5px;
		cursor: pointer;
		@include glossy-accent;

		&:hover {
			filter: brightness(1.07);
		}
	}

	@include mobile {
		.grade-hint {
			margin: 1.6rem;
			font-size: 1.4rem;
		}
	}
</style>
