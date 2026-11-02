<script lang="ts">
	// the draft as files for people who work in spreadsheets: the catalogue,
	// a term's offerings, the faculty list, the open checks, and a full
	// backup. built in the browser from the draft on screen, unsaved edits
	// included.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { csvText, download, exportWorkbook } from '$lib/features/office/spreadsheet';

	const office = useOffice();
	const doc = $derived(office.document);
	const stamp = () => new Date().toISOString().slice(0, 10);
	const YEARS = ['year 1', 'year 2', 'year 3', 'year 4'];

	function catalogue() {
		if (!doc) return;
		const rows = doc.curriculum.courses.map((c) => [
			c.code,
			c.title,
			c.subject,
			c.credits,
			c.offered.map((t) => `T${t}`).join(' '),
			c.eligibleYears.join(' '),
			c.prereqs.join(' '),
			c.faculty,
			c.retired ? 'retired' : ''
		]);
		exportWorkbook(`kcal-catalogue-${stamp()}.xlsx`, [
			['Code', 'Title', 'Department', 'Credits', 'Runs in', 'Years', 'Prerequisites', 'Faculty', 'Status'],
			...rows
		]);
	}

	function offerings() {
		if (!doc) return;
		const title = (code: string) => doc.curriculum.courses.find((c) => c.code === code)?.title ?? '';
		const rows = doc.offerings
			.filter((o) => o.term === office.term)
			.map((o) => [
				o.code,
				o.section,
				title(o.code),
				o.facultyText,
				o.capacity,
				o.minimum,
				o.delivery,
				o.approval,
				...YEARS.map((y) => o.eligibility[y] ?? ''),
				...doc.fields.map((f) => o.extras[f.id] ?? '')
			]);
		exportWorkbook(`kcal-offerings-${office.term}-${stamp()}.xlsx`, [
			[
				'Code',
				'Section',
				'Title',
				'Faculty',
				'Capacity',
				'Minimum',
				'Delivery',
				'Approval',
				...YEARS,
				...doc.fields.map((f) => f.label)
			],
			...rows
		]);
	}

	function faculty() {
		if (!doc) return;
		const rows = doc.curriculum.lecturers.map((f) => [f.name, f.email, f.position, f.office_hours]);
		download(`kcal-faculty-${stamp()}.csv`, csvText([['Name', 'Email', 'Position', 'Office hours'], ...rows]));
	}

	function checks() {
		const rows = office.issues.map((i) => [i.severity, i.area, i.record, i.message]);
		download(`kcal-checks-${stamp()}.csv`, csvText([['Severity', 'Area', 'Record', 'Message'], ...rows]));
	}

	function backup() {
		download(`kcal-office-draft-${stamp()}.json`, JSON.stringify(doc), 'application/json');
	}
</script>

<h1>Reports & downloads</h1>
<p class="office-lead">The draft as spreadsheets, including any changes not saved yet.</p>

{#if doc}
	<div class="office-job-grid">
		<button class="office-job" onclick={catalogue}
			><b>Course catalogue</b><span>{doc.curriculum.courses.length} courses, Excel</span></button
		>
		<button class="office-job" onclick={offerings}
			><b>Offerings · {doc.terms.find((t) => t.id === office.term)?.label ?? 'no term'}</b><span
				>{doc.offerings.filter((o) => o.term === office.term).length} sections, Excel. Change the term under Terms & offerings.</span
			></button
		>
		<button class="office-job" onclick={faculty}
			><b>Faculty directory</b><span>{doc.curriculum.lecturers.length} people, CSV</span></button
		>
		<button class="office-job" onclick={checks}><b>Open checks</b><span>{office.issues.length} items, CSV</span></button
		>
		<button class="office-job" onclick={backup}
			><b>Full backup</b><span>The whole draft as JSON, for safekeeping</span></button
		>
	</div>
{/if}
