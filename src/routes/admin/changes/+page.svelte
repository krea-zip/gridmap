<script lang="ts">
	// ─────────────────────────────────────────────
	// Changes: everything edited anywhere in /admin, in one place.
	//
	// kcal has no server for these edits: they live in this browser and apply
	// to the planner here. Making them reach students means exporting the file
	// and handing it to whoever deploys the site, so this page is the one that
	// says that plainly, and gives the admin the export, the import and a way
	// to throw changes away.
	// ─────────────────────────────────────────────
	import { ADMIN_CHANGED } from '$lib/adminEdits';
	import { bundleFileName, buildBundle, discard, importBundle, sections, type ChangeSection } from '$lib/adminBundle';

	let secs = $state<ChangeSection[]>([]);
	let loaded = $state(false);
	let total = $derived(secs.reduce((sum, s) => sum + s.count, 0));
	let message = $state('');

	$effect(() => {
		const recount = () => {
			secs = sections();
			loaded = true;
		};
		recount();
		window.addEventListener(ADMIN_CHANGED, recount);
		return () => window.removeEventListener(ADMIN_CHANGED, recount);
	});

	function exportAll() {
		const blob = new Blob([JSON.stringify(buildBundle(), null, '\t')], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = bundleFileName();
		a.click();
		URL.revokeObjectURL(a.href);
		message = `Saved ${a.download}. Send it to whoever deploys the site.`;
	}

	let importEl: HTMLInputElement;
	async function importFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			if (total && !confirm(`Importing replaces the ${total} change${total === 1 ? '' : 's'} on this browser with what the file holds. Continue?`)) return;
			if (!importBundle(JSON.parse(await file.text()))) throw new Error('not ours');
			location.reload(); // added courses and departments join the catalogue on a fresh load
		} catch {
			message = 'That file is not a readable kcal changes file.';
		} finally {
			importEl.value = '';
		}
	}

	// a destructive button asks twice: the first click arms it
	let armed = $state<string | null>(null);
	let armTimer: ReturnType<typeof setTimeout>;
	function confirmThen(id: string, run: () => void) {
		if (armed !== id) {
			armed = id;
			clearTimeout(armTimer);
			armTimer = setTimeout(() => (armed = null), 4000);
			return;
		}
		clearTimeout(armTimer);
		armed = null;
		run();
	}
	const discardSection = (id: ChangeSection['id']) =>
		confirmThen(id, () => {
			discard([id]);
			location.reload();
		});
	const discardEverything = () =>
		confirmThen('all', () => {
			discard();
			location.reload();
		});
</script>

<div class="doc">
	<h1>Changes</h1>
	<p class="lede">
		Everything you change is saved on this browser and shows in the planner here. To make it live for students,
		export the file and send it to whoever deploys the site.
	</p>

	<div class="actions">
		<button class="btn primary" onclick={exportAll} disabled={!total}>Export {total || ''} change{total === 1 ? '' : 's'}</button>
		<button class="btn" onclick={() => importEl.click()}>Import a file</button>
		<a class="btn" href="/" data-sveltekit-reload>Open planner ↗</a>
		<input bind:this={importEl} type="file" accept="application/json" onchange={importFile} hidden />
	</div>
	{#if message}<p class="note" role="status">{message}</p>{/if}

	{#if loaded && !total}
		<p class="empty">Nothing changed yet. The planner matches the published data.</p>
	{/if}

	{#each secs.filter((s) => s.count) as s (s.id)}
		<details class="group">
			<summary>
				<span class="name">{s.label}</span>
				<span class="n">{s.count} {s.unit}{s.count === 1 ? '' : 's'}</span>
			</summary>
			<ul>
				{#each s.lines as line (line)}<li>{line}</li>{/each}
			</ul>
			<div class="foot">
				<a class="link" href={s.href} data-sveltekit-reload>open {s.label.toLowerCase()}</a>
				<button class="btn sm danger" class:confirming={armed === s.id} onclick={() => discardSection(s.id)}>
					{armed === s.id ? 'click again to discard' : 'discard these'}
				</button>
			</div>
		</details>
	{/each}

	{#if total}
		<div class="all">
			<button class="btn danger" class:confirming={armed === 'all'} onclick={discardEverything}>
				{armed === 'all' ? 'click again to discard everything' : 'Discard every change'}
			</button>
		</div>
	{/if}

	<h2>How changes reach students</h2>
	<ol class="steps">
		<li><b>Check</b> your work in the planner (“Open planner”).</li>
		<li><b>Export</b> the file above.</li>
		<li><b>Send it</b> to whoever deploys the site. They fold it into the data and redeploy; until then only this browser sees your changes.</li>
	</ol>
</div>

<style lang="scss">
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-bottom: 1.6rem;

		:global(.btn) {
			padding: 0.8rem 1.6rem;
			font-size: 1.35rem;
		}
	}

	.group {
		margin-top: 1rem;
		border: 1px solid var(--adm-line-strong);
		border-radius: 8px;

		summary {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 1.2rem 1.6rem;
			font-size: 1.4rem;
			cursor: pointer;

			.name {
				font-weight: 600;
			}

			.n {
				color: var(--color-text-muted);
			}
		}

		ul {
			margin: 0;
			padding: 0 1.6rem 0.4rem 3.2rem;
			max-height: 30rem;
			overflow-y: auto;
			font-size: 1.25rem;
			line-height: 1.6;
			color: var(--color-text-muted);
		}

		.foot {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 1rem 1.6rem 1.2rem;
		}
	}

	.all {
		margin-top: 2rem;
	}

	h2 {
		margin: 4rem 0 1rem;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.steps {
		margin: 0;
		padding-left: 2rem;
		font-size: 1.35rem;
		line-height: 1.7;
	}
</style>
