<script lang="ts">
	// a term's offerings sheet into the draft. the file is read in the
	// browser (it never needs to reach the server whole), every row is shown
	// before anything changes, and the result is an unsaved draft like any
	// other edit, so a bad import is one "reload" away from undone.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import {
		IMPORT_FIELDS,
		applyImport,
		detectMapping,
		previewImport,
		readWorkbook,
		type ImportPreview,
		type Mapping
	} from '$lib/features/office/spreadsheet';

	const office = useOffice();

	let sheets = $state<{ name: string; rows: string[][] }[]>([]);
	let fileName = $state('');
	let sheetIndex = $state(0);
	let mapping = $state<Mapping>({});
	let preview = $state<ImportPreview | null>(null);
	let busy = $state(false);
	let problem = $state('');
	let done = $state('');

	const sheet = $derived(sheets[sheetIndex]);
	const headers = $derived(sheet?.rows[0] ?? []);
	const chosen = $derived(preview?.rows.filter((r) => r.selected).length ?? 0);

	async function choose(file: File | undefined) {
		if (!file) return;
		reset();
		busy = true;
		try {
			sheets = await readWorkbook(file);
			fileName = file.name;
			// a file named for its term ("25_T2 offerings.xlsx") picks that term
			const named = file.name.match(/(\d{2})_T([123])/i)?.[0]?.toUpperCase();
			if (named && office.document?.terms.some((t) => t.id === named)) office.term = named;
		} catch (e) {
			problem = e instanceof Error ? e.message : 'That file could not be read.';
		} finally {
			busy = false;
		}
	}

	// a new sheet gets its own column guess
	$effect(() => {
		mapping = detectMapping(headers);
		preview = null;
	});

	async function review() {
		if (!office.document || !sheet) return;
		busy = true;
		problem = '';
		try {
			preview = await previewImport(sheet.rows, fileName, office.term, office.document, $state.snapshot(mapping));
		} catch (e) {
			problem = e instanceof Error ? e.message : 'The sheet could not be read.';
		} finally {
			busy = false;
		}
	}

	function apply() {
		if (!office.document || !preview || !sheet) return;
		applyImport(office.document, $state.snapshot(preview), fileName, office.term, sheet.rows);
		done = `${chosen} rows added to the draft. Review them under Courses and Terms & offerings, then save.`;
		reset();
	}

	function reset() {
		sheets = [];
		preview = null;
		problem = '';
	}
</script>

<h1>upload spreadsheet</h1>
<p class="office-lead">
	import a term’s course list (CSV or Excel). You’ll see every row before anything changes, and nothing is shared until
	you save the draft.
</p>

{#if done}<p class="office-note" role="status">{done}</p>{/if}
{#if problem}<p class="office-note error" role="alert">{problem}</p>{/if}

<section class="office-card">
	<h2>1 · Choose the file</h2>
	<input type="file" accept=".csv,.xlsx" disabled={busy} onchange={(e) => choose(e.currentTarget.files?.[0])} />
</section>

{#if sheet && office.document}
	<section class="office-card">
		<h2>2 · Sheet and term</h2>
		<div class="office-row">
			{#if sheets.length > 1}
				<label
					>Sheet
					<select bind:value={sheetIndex}>
						{#each sheets as s, i (i)}<option value={i}>{s.name} · {s.rows.length - 1} rows</option>{/each}
					</select>
				</label>
			{/if}
			<label
				>term
				<select bind:value={office.term}>
					{#each office.document.terms as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
				</select>
			</label>
			<a href="/admin/offerings">add a term</a>
		</div>
	</section>

	<section class="office-card">
		<h2>3 · Match the columns</h2>
		<p class="office-help">Guessed from the headings. Course code and title are needed; the rest are optional.</p>
		<div class="office-form">
			{#each IMPORT_FIELDS as [field, label] (field)}
				<label
					>{label}
					<select
						value={mapping[field] ?? ''}
						onchange={(e) => {
							const v = e.currentTarget.value;
							mapping[field] = v === '' ? undefined : Number(v);
							preview = null;
						}}
					>
						<option value="">-</option>
						{#each headers as h, i (i)}<option value={i}>{h || `Column ${i + 1}`}</option>{/each}
					</select>
				</label>
			{/each}
		</div>
		<button class="primary" disabled={busy} onclick={review}>review the rows</button>
	</section>
{/if}

{#if preview}
	<section class="office-card">
		<h2>4 · Review</h2>
		{#each preview.warnings as w (w)}<p class="office-note error">{w}</p>{/each}
		<p class="office-help">
			{preview.rows.length} rows · {preview.rows.filter((r) => r.action === 'new').length} new courses ·
			{preview.skipped} skipped (blank or unreadable)
		</p>
		<div class="office-table-scroll">
			<table>
				<thead><tr><th></th><th>Row</th><th>Course</th><th>Change</th><th>Notes</th></tr></thead>
				<tbody>
					{#each preview.rows as row (row.row)}
						<tr>
							<td><input type="checkbox" aria-label="Import row {row.row}" bind:checked={row.selected} /></td>
							<td>{row.row}</td>
							<td><b>{row.course.code}</b> {row.course.title}</td>
							<td>{row.action === 'new' ? 'New course' : 'Update'}</td>
							<td>{row.messages.join(' ')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="office-actions">
			<button class="primary" disabled={!chosen} onclick={apply}>add {chosen} rows to the draft</button>
			<button onclick={reset}>cancel</button>
		</div>
	</section>
{/if}
