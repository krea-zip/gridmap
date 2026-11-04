<script lang="ts">
	// one course as one line: the fields that change most, in place. they look
	// like plain text until pointed at, so a long list stays calm to read.
	import { moveCourse, toggleOffered, type OfficeCourse } from '$lib/features/office/model';
	import type { Subject } from '$lib/types';

	let {
		course,
		subjects,
		open,
		onopen
	}: { course: OfficeCourse; subjects: Subject[]; open: boolean; onopen: () => void } = $props();

	const TERMS = [1, 2, 3] as const;
</script>

<!-- the code is the row's real link; a click anywhere else on it is a shortcut -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<li
	class="row course-grid"
	class:open
	class:retired={course.retired}
	onclick={(e) => {
		if (!(e.target as Element).closest('input, select, a, label')) onopen();
	}}
>
	<a
		class="code"
		href="?course={encodeURIComponent(course.code)}"
		data-sveltekit-noscroll
		data-sveltekit-keepfocus
		data-sveltekit-replacestate>{course.code}</a
	>
	<input aria-label="Title of {course.code}" bind:value={course.title} />
	<select
		aria-label="Department of {course.code}"
		value={course.subject}
		onchange={(e) => moveCourse(course, e.currentTarget.value)}
	>
		{#each subjects as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
	</select>
	<input
		type="number"
		class:pending={course.pendingCredits}
		aria-label="Credits of {course.code}"
		title={course.pendingCredits ? 'credits to confirm' : undefined}
		min="0"
		max="30"
		step="0.5"
		bind:value={course.credits}
		onchange={() => (course.pendingCredits = false)}
	/>
	<span class="terms">
		{#each TERMS as t (t)}
			<input
				type="checkbox"
				aria-label="{course.code} usually runs in trimester {t}"
				checked={course.offered.includes(t)}
				onchange={() => toggleOffered(course, t)}
			/>
		{/each}
	</span>
	<select
		aria-label="Status of {course.code}"
		value={course.retired ? 'retired' : 'active'}
		onchange={(e) => (course.retired = e.currentTarget.value === 'retired')}
	>
		<option value="active">active</option>
		<option value="retired">retired</option>
	</select>
</li>

<style lang="scss">
	.row {
		min-height: 3.8rem;
		border-bottom: var(--office-rule);
		cursor: pointer;
		// a long list only draws what's on screen
		content-visibility: auto;
		contain-intrinsic-block-size: auto 3.8rem;

		&:hover {
			background: var(--color-hover);
		}

		&.open {
			background: var(--color-subtle);
			box-shadow: inset 3px 0 0 var(--color-accent);
		}

		&.retired {
			color: var(--color-text-muted);

			input:not([type='checkbox']),
			select {
				color: var(--color-text-muted);
			}
		}
	}

	.code {
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	input:not([type='checkbox']),
	select {
		width: 100%;
		min-height: 3rem;
		padding-block: 0.2rem;
		background-color: transparent;
		border-color: transparent;
		box-shadow: none;
		transition: border-color 0.12s ease;

		&:hover {
			border-color: var(--color-border-card);
		}

		&:focus {
			background-color: var(--color-bg-card-start);
			border-color: var(--color-accent);
		}
	}

	select {
		appearance: none;
		cursor: pointer;

		&:hover,
		&:focus {
			appearance: auto;
		}
	}

	// no spinner on every line; the arrow keys still step it
	input[type='number'] {
		appearance: textfield;

		&::-webkit-inner-spin-button {
			appearance: none;
		}
	}

	.pending {
		color: #9e7135;
		background-color: color-mix(in srgb, #bf9a52 16%, transparent);
	}

	.terms {
		display: flex;
		gap: 0.7rem;
	}
</style>
