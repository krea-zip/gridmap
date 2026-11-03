<!-- what the course panel shows before a course is picked: the latest
     updates to the site, newest first -->
<script lang="ts">
	import { updates } from './changelog';
</script>

<div class="d-empty">
	<div class="label">updates</div>
	<ul>
		{#each updates as u (u.date + u.text)}
			<li>
				<time>{u.date}</time>
				<span>{u.text}</span>
			</li>
		{/each}
	</ul>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.d-empty {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1.6rem;
		font-size: var(--text-body);
		line-height: 1.5;
		color: var(--color-text-muted);

		.label {
			@include section-label;
		}

		ul {
			display: flex;
			flex-direction: column;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		li {
			display: flex;
			flex-direction: column;
			padding: 0.8rem 0;
			border-bottom: 1px dotted var(--color-border-light);

			&:last-child {
				border-bottom: 0;
			}
		}

		time {
			color: var(--color-text);
			font-weight: 600;
		}
	}
</style>
