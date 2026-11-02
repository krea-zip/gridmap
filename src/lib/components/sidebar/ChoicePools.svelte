<script lang="ts">
	// a programme's "any three of the following" pools: what to pick and how
	// far along the plan is, one block per programme
	import { usePlan } from '$lib/planner/context';

	const plan = usePlan();
</script>

{#if plan.choices.length}
	<div class="section">
		<h3>choices</h3>

		<div class="choices">
			{#each plan.choices as prog (prog.role + prog.label)}
				<div class="prog">
					<div class="prog-name">{prog.label} · {prog.role}</div>
					{#each prog.groups as group, gi (group.rule + gi)}
						{@const done = group.chosen >= group.pick}
						<!-- courses you can take first; the ones not in the catalogue
						     yet trail behind, dimmed -->
						{@const courses = [...group.courses].sort((a, b) => Number(!a.code) - Number(!b.code))}
						<div class="choice" class:done>
							<div class="rule">
								<span>{group.rule}</span>
								<span class="count">{done ? '✓ done' : `${group.chosen} of ${group.pick}`}</span>
							</div>
							{#if group.counts !== 'required'}
								<div class="note">counts toward {group.counts} credits</div>
							{/if}
							{#if courses.length}
								<ul>
									{#each courses as course (course.title)}
										<li
											class:missing={!course.code}
											class:done={course.code && plan.placedCodes.has(course.code)}
											title={course.title}
										>
											<!-- labelled like the grid (the codes / titles switches); a
											     click finds the course in the catalogue -->
											{#if course.code}
												{@const code = course.code}
												<button onclick={() => plan.revealCourse(code)}>
													{#if plan.showCodes}<b>{plan.shownCode(code)}</b>{/if}{plan.showCodes && plan.showTitles
														? ' '
														: ''}{#if plan.showTitles}{course.title}{/if}
												</button>
											{:else}{course.title} <em>· not offered yet</em>{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.section {
		@include rail-section;
	}

	.choices {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.2rem 1.6rem;
	}

	// each programme on its own dotted rule, like the programmes above
	.prog {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	.prog + .prog {
		padding-top: 1.2rem;
		border-top: 1px dotted var(--color-border-light);
	}

	.prog-name {
		@include section-label;
	}

	.rule {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.2rem 0.8rem;
		font-size: var(--text-body);
		font-weight: 700;
		color: var(--color-text);
	}

	// how far along a pool is, at the end of its rule
	.count {
		flex: none;
		font-size: 1.15rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);

		.done & {
			color: var(--color-hint-good-deep);
		}
	}

	.note {
		font-size: var(--text-body);
		line-height: 1.4;
		color: var(--color-text-muted);
	}

	// one line per course, long titles trimmed (full title on hover) so a pool
	// reads as a tidy list instead of a wall of wrapped text
	ul {
		margin: 0.4rem 0 0;
		padding-left: 0;
		font-size: var(--text-body);
		line-height: 1.5;
		color: var(--color-text);
	}

	li {
		position: relative;
		padding-left: 1.6rem;
		list-style: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;

		// its own bullet, so a course already on the grid can swap it for a
		// tick and the pool reads "3 chosen, 2 to go" at a glance
		&::before {
			content: '•';
			position: absolute;
			left: 0.3rem;
			color: var(--color-text-muted);
		}

		&.done::before {
			content: '✓';
			left: 0.1rem;
			font-size: 1.1rem;
			font-weight: 700;
			color: var(--color-hint-good-deep);
		}

		// listed by the university but never taught yet: "on paper, not on the plan"
		&.missing {
			color: var(--color-text-muted);

			em {
				font-size: 1.1rem;
			}
		}
	}

	button {
		display: block;
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0;
		font: inherit;
		text-align: left;
		color: inherit;
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}
	}
</style>
