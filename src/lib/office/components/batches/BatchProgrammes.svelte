<script lang="ts">
	// which subjects this batch can take as a major, minor or concentration. a
	// choice carries on to later batches until one changes it, so opening
	// philosophy for 2027 is one tick, not one per year.
	import { useOffice } from '$lib/office/workspace.svelte';
	import { ROLES, missingTracks, offerState, setOffer, tracksOf } from '$lib/office/batches';
	import { setFor } from '$lib/office/requirements';
	import type { ProgrammeRole, Subject } from '$lib/types';

	let { batch }: { batch: number } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);

	let search = $state('');
	let changedOnly = $state(false);

	const changed = (s: Subject) =>
		ROLES.some((role) => {
			const state = offerState(doc, s, role, batch);
			return state.own !== undefined || state.from !== null;
		});
	const subjects = $derived(
		doc.curriculum.subjects.filter(
			(s) =>
				s.id !== 'core' &&
				s.id !== 'open' &&
				s.label.toLowerCase().includes(search.trim().toLowerCase()) &&
				(!changedOnly || changed(s))
		)
	);
	const set = $derived(setFor(doc, batch));

	const setUpHref = (s: Subject, role: ProgrammeRole) =>
		`/admin/requirements?set=${set?.id}&subject=${encodeURIComponent(s.id)}&variant=${missingTracks(doc, s.id, role, batch)[0]}`;
</script>

<section class="office-card">
	<h2>programmes this batch can take</h2>
	<p class="office-help">
		Students in this batch see exactly these in the planner, from the next publish. A change carries on to later batches
		until one of them changes it back.
	</p>
	<div class="office-row">
		<label>find a department<input type="search" bind:value={search} placeholder="e.g. philosophy" /></label>
		<label class="office-check"><input type="checkbox" bind:checked={changedOnly} /> only what’s been changed</label>
	</div>

	<div class="office-table-scroll">
		<table>
			<thead>
				<tr
					><th>Department</th>{#each ROLES as role (role)}<th>{role}</th>{/each}</tr
				>
			</thead>
			<tbody>
				{#each subjects as s (s.id)}
					<tr>
						<td><b>{s.label}</b></td>
						{#each ROLES as role (role)}
							{@const state = offerState(doc, s, role, batch)}
							{@const gaps = state.on && (state.own || state.from) ? missingTracks(doc, s.id, role, batch) : []}
							<td class:own={state.own !== undefined}>
								<label class="offer">
									<input
										type="checkbox"
										aria-label="{s.label} as a {role} for the {batch} batch"
										checked={state.on}
										onchange={(e) => setOffer(doc, s.id, role, batch, e.currentTarget.checked)}
									/>
									<span>{state.on ? 'Offered' : 'Not offered'}</span>
								</label>
								<small>
									{#if state.own !== undefined}
										set for {batch}
										<button class="reset" onclick={() => setOffer(doc, s.id, role, batch, undefined)}>undo</button>
									{:else if state.from}
										since {state.from}
									{:else}
										usual
									{/if}
								</small>
								{#if gaps.length}
									<a class="gap" href={setUpHref(s, role)}>
										{gaps.length} of {tracksOf(role).length} tracks need requirements →
									</a>
								{/if}
							</td>
						{/each}
					</tr>
				{:else}
					<tr><td colspan="4"><span class="office-help">No departments match.</span></td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	td {
		vertical-align: top;
	}

	td.own {
		background: var(--color-subtle);
	}

	th:not(:first-child) {
		text-transform: capitalize;
	}

	.offer {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.6rem;
		font-weight: 500;
		cursor: pointer;
	}

	.offer input {
		flex: none;
		width: 1.7rem;
		min-width: 0;
		height: 1.7rem;
		min-height: 0;
		margin: 0;
	}

	small {
		display: block;
		margin-top: 0.2rem;
		font-size: 1.1rem;
		color: var(--color-text-muted);
	}

	.reset {
		min-height: 0;
		padding: 0 0.3rem;
		font-size: 1.1rem;
		color: var(--color-accent);
		text-decoration: underline;
		background: none;
		border: 0;
	}

	.gap {
		display: block;
		margin-top: 0.3rem;
		font-size: 1.15rem;
		font-weight: 550;
		color: #9e7135;
	}
</style>
