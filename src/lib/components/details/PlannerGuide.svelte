<!-- what the course panel shows before a course is picked: how the planner
     works, and what the little marks on the courses mean. a first visit
     lands here, so it reads as a short manual -->

<div class="d-empty">
	<p>pick a course on the grid or in the catalogue to see it here.</p>

	<div class="label">how it works</div>
	<ul class="guide">
		<li>
			<b>drag</b> a course from the catalogue onto a trimester, or between trimesters
		</li>
		<li><b>click a trimester</b> on the grid to zoom in on it</li>
		<li>
			<b>hints</b> on the left flag anything that breaks a rule, click one to find its course
		</li>
		<li>
			<b>view</b>, above the grid, switches what the board shows: <b>grades</b> turns the plan into your transcript
		</li>
	</ul>

	<div class="label">reading the marks</div>
	<ul class="marks">
		<li>
			<span class="m-dot" aria-hidden="true"></span>required by your programme
		</li>
		<li>
			<span class="m-mark" data-kind="warn" aria-hidden="true"></span>breaks a rule, a prerequisite out of order, say
		</li>
		<li>
			<span class="m-mark" data-kind="caution" aria-hidden="true"></span>worth a look, under the credit minimum, say
		</li>
		<li>
			<span class="m-mark" data-kind="info" aria-hidden="true"></span>a note, counts on the transcript only, say
		</li>
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
			margin-top: 0.8rem;
			padding-top: 1rem;
			border-top: 1px dotted var(--color-border-light);
		}

		ul {
			display: flex;
			flex-direction: column;
			gap: 0.6rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		b {
			color: var(--color-text);
		}

		.marks li {
			display: flex;
			align-items: baseline;
			gap: 0.8rem;
		}
	}

	.m-dot {
		@include required-dot;
		align-self: center;
	}

	.m-mark {
		@include severity-mark;
		align-self: center;
	}
</style>
