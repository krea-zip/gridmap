<script lang="ts" module>
	// filters outlive the page, so coming back finds the list as it was left
	const filters = $state({ query: '', department: '', show: 'active' });
</script>

<script lang="ts">
	// the whole catalogue in one list. the fields that change most are edited
	// right in the row; opening a course slides in the rest. what's open lives
	// in the address, so a search or a check can link straight to a course.
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { newCourse, type OfficeCourse } from '$lib/features/office/model';
	import { reducedMotion } from '$lib/ui/transitions';
	import CoursePanel from './courses/CoursePanel.svelte';
	import CourseRow from './courses/CourseRow.svelte';

	const office = useOffice();
	const doc = $derived(office.document);
	const subjects = $derived((doc?.curriculum.subjects ?? []).filter((s) => s.id !== 'open'));
	const courses = $derived(doc?.curriculum.courses ?? []);

	const unfinished = (c: OfficeCourse) => !!c.pendingCredits || !doc?.descriptions[c.code];
	const shown = (c: OfficeCourse, show: string) =>
		show === 'all' || (show === 'retired' ? !!c.retired : show === 'unfinished' ? unfinished(c) : !c.retired);

	// only a new filter or a new course redraws the list: a row must not vanish
	// under someone mid-edit because their title stopped matching the search
	const rows = $derived.by(() => {
		const { query, department, show } = filters;
		const words = query.trim().toLowerCase();
		void courses.length;
		return untrack(() =>
			courses
				.filter(
					(c) =>
						(!department || c.subjects.includes(department)) &&
						shown(c, show) &&
						`${c.codes.join(' ')} ${c.title}`.toLowerCase().includes(words)
				)
				.toSorted((a, b) => a.code.localeCompare(b.code))
		);
	});

	const code = $derived(page.url.searchParams.get('course'));
	const current = $derived(code ? courses.find((c) => c.code === code || c.codes.includes(code)) : undefined);
	const go = (to: string) => goto(to, { noScroll: true, keepFocus: true, replaceState: true });
	const open = (course: string) => go(`?course=${encodeURIComponent(course)}`);

	let adding = $state(false);
	let draft = $state({ code: '', title: '', subject: '' });
	let problem = $state('');

	function add() {
		if (!doc) return;
		const clean = draft.code.trim().toUpperCase();
		if (!/^[A-Z]{2,5}\d{3}[A-Z]?$/.test(clean) || !draft.title.trim() || !draft.subject) {
			problem = 'Enter a course code, title and department.';
			return;
		}
		if (courses.some((c) => c.codes.includes(clean))) {
			problem = 'This course code is already in use.';
			return;
		}
		doc.curriculum.courses.push(newCourse(clean, draft.title.trim(), draft.subject));
		draft = { code: '', title: '', subject: '' };
		adding = false;
		problem = '';
		void open(clean);
	}
</script>

<div class="courses" class:with-panel={!!current}>
	<div class="top">
		<div class="tools">
			<h1>courses</h1>
			<input type="search" aria-label="Find a course" placeholder="code or title" bind:value={filters.query} />
			<select aria-label="Department" bind:value={filters.department}>
				<option value="">all departments</option>
				{#each subjects as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
			</select>
			<select aria-label="Show" bind:value={filters.show}>
				<option value="active">active</option>
				<option value="retired">retired</option>
				<option value="unfinished">unfinished</option>
				<option value="all">all</option>
			</select>
			<span class="office-badge" role="status">{rows.length}/{courses.length}</span>
			<button class="add" onclick={() => (adding = !adding)}>+ add course</button>
		</div>

		{#if adding}
			<form
				class="adding"
				transition:slide={{ duration: reducedMotion() ? 0 : 200 }}
				onsubmit={(e) => {
					e.preventDefault();
					add();
				}}
			>
				<input aria-label="Course code" placeholder="ECON340" bind:value={draft.code} />
				<input aria-label="Course title" placeholder="title" bind:value={draft.title} />
				<select aria-label="Department" bind:value={draft.subject}>
					<option value="">department</option>
					{#each subjects as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
				</select>
				<button class="primary">create</button>
			</form>
			{#if problem}<p class="office-note error" role="alert">{problem}</p>{/if}
		{/if}

		<div class="columns course-grid" aria-hidden="true">
			<span>code</span><span>title</span><span>department</span><span>credits</span>
			<span class="terms"><i>t1</i><i>t2</i><i>t3</i></span><span>status</span>
		</div>
	</div>

	<ul>
		{#each rows as course (course.code)}
			<CourseRow {course} {subjects} open={course === current} onopen={() => open(course.code)} />
		{:else}
			<li class="office-empty">No courses match.</li>
		{/each}
	</ul>
</div>

{#if current}
	<CoursePanel course={current} onclose={() => go(page.url.pathname)} />
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.courses {
		transition: margin-right 240ms var(--ease-out);

		// the list stays usable beside the panel, not behind it
		&.with-panel {
			margin-right: min(48rem, 50%);
		}
	}

	.top {
		position: sticky;
		top: 0;
		z-index: 2;
		margin: -2.4rem -3.2rem 0;
		padding: 1.2rem 3.2rem 0;
		background: var(--color-bg-board-page);
	}

	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		align-items: center;

		h1 {
			margin: 0 0.6rem 0 0;
		}

		input {
			flex: 1;
			min-width: 16rem;
			max-width: 34rem;
			width: auto;
			border-radius: 999px;
		}

		select {
			width: auto;
		}
	}

	.add {
		margin-left: auto;
	}

	.adding {
		display: grid;
		grid-template-columns: 12rem minmax(0, 1fr) 20rem auto;
		gap: 0.8rem;
		padding-top: 0.8rem;
	}

	.columns {
		padding-block: 1rem 0.4rem;
		border-bottom: 1px solid var(--color-border-card);

		span {
			@include section-label;
			font-size: 1.05rem;
		}
	}

	.terms {
		display: flex;
		gap: 0.7rem;

		i {
			width: 1.6rem;
			font-style: normal;
			text-align: center;
		}
	}

	ul {
		padding: 0;
		margin: 0;
		list-style: none;
	}

	// the row and its heading share one set of columns
	:global(.course-grid) {
		display: grid;
		grid-template-columns: 9rem minmax(16rem, 1fr) 16rem 7rem 8rem 9.5rem;
		gap: 0.6rem;
		align-items: center;
		padding-inline: 0.6rem;
	}
</style>
