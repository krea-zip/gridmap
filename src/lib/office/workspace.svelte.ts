// the shared draft as one staff member edits it. the server hands it over
// rendered (admin/+layout.server.ts); edits stay here until saved, because
// a curriculum change spans many records and staff review it as a whole.
// saving posts the whole draft with its revision, so two people can't
// silently overwrite each other.
import { createContext } from 'svelte';
import { invalidate } from '$app/navigation';
import { DEFAULT_POLICIES, publication, changesBetween, type OfficeDocument, type WorkspacePayload } from './model';
import { validateOffice } from './validation';
import { PREVIEW_KEY } from '$lib/curriculum/preview';

export class Workspace {
	document = $state<OfficeDocument | null>(null);
	/** the draft as last saved, to tell unsaved edits apart */
	saved = $state<OfficeDocument | null>(null);
	/** the draft as it was opened, what "changes" are counted against */
	baseline = $state<OfficeDocument | null>(null);
	revision = $state(0);
	status = $state('draft');
	/** who signed in, as they typed it */
	name = $state('');
	deployment = $state('');
	release = $state('');
	/** the term most office pages are about */
	term = $state('');
	busy = $state(false);
	message = $state('');
	error = $state('');
	/** someone else saved first; this draft can't be saved over theirs */
	conflict = $state(false);

	issues = $derived(this.document ? validateOffice(this.document) : []);
	errors = $derived(this.issues.filter((i) => i.severity === 'error'));
	dirty = $derived(!!this.document && JSON.stringify(this.document) !== JSON.stringify(this.saved));
	changes = $derived(this.document && this.baseline ? changesBetween(this.baseline, this.document) : []);

	/** take the draft the server loaded. a form action anywhere in the office
	 *  reloads it, so unsaved edits are kept and only the draft's standing
	 *  updates; a revision someone else saved meanwhile is caught on save */
	load(payload: WorkspacePayload, name: string) {
		this.name = name;
		this.status = payload.status;
		this.deployment = payload.deployment;
		this.release = payload.release;
		if (this.dirty && !this.#replace) return;
		this.#replace = false;
		// drafts saved before policies existed get the regulation defaults
		payload.document.curriculum.policies ??= structuredClone(DEFAULT_POLICIES);
		// and a release carries the offers without the office's own record
		payload.document.curriculum.batchProfiles = (payload.document.curriculum.batchProfiles ?? []).map((p) => ({
			...p,
			changes: p.changes ?? [],
			note: p.note ?? ''
		}));
		this.document = payload.document;
		this.saved = structuredClone(payload.document);
		this.baseline = structuredClone(payload.document);
		this.revision = payload.revision;
		this.term = payload.document.terms.find((t) => t.status !== 'archived')?.id ?? payload.document.terms[0]?.id ?? '';
		this.conflict = false;
		this.error = '';
		this.message = this.revision
			? `Shared draft · revision ${this.revision}`
			: 'Start by saving the catalogue as a shared draft.';
	}

	/** fetch the shared draft again and replace what's on screen, the way
	 *  out of a save conflict (after the toolbar offers a download) */
	reload() {
		this.#replace = true;
		return invalidate('office:workspace');
	}
	#replace = false;

	async save(note = 'Updated academic records') {
		if (this.busy || !this.document) return false;
		const draft = $state.snapshot(this.document);
		return this.#run(async () => {
			const data = await this.#post('workspace', { document: draft, revision: this.revision, note });
			this.revision = data.revision;
			this.status = data.status;
			this.saved = draft;
			this.message = `Saved · revision ${this.revision}`;
		});
	}

	/** the unsaved draft in the student planner, in a new tab: the planner
	 *  reads it from this tab's session storage, nothing is published */
	preview() {
		if (!this.document) return;
		try {
			sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(publication($state.snapshot(this.document))));
			window.open('/?admin-preview=1', '_blank');
		} catch {
			this.error = 'The preview could not be opened. Check browser storage permissions.';
		}
	}

	async #run(action: () => Promise<void>) {
		if (this.busy) return false;
		this.busy = true;
		this.error = '';
		try {
			await action();
			return true;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'The action could not be completed.';
			return false;
		} finally {
			this.busy = false;
		}
	}

	async #post(path: string, body: unknown) {
		const response = await fetch(`/api/admin/${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const result = await response.json().catch(() => ({ message: 'The server response could not be read.' }));
		if (!response.ok) {
			if (response.status === 409) this.conflict = true;
			throw Error(result.message ?? 'The request failed. Try again.');
		}
		return result;
	}
}

export const [useOffice, provideOffice] = createContext<Workspace>();
