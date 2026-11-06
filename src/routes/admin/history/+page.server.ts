// what students have been shown: every publish, newest first. any of them
// can be opened as an unsaved draft, which is how a bad release is undone.
import { error } from '@sveltejs/kit';
import { attempt, databaseError, officeAccess } from '$lib/server/office';
import type { OfficeDocument, OfficeRevision } from '$lib/office/model';

export const load = async (event) => {
	const { db } = officeAccess(event);
	const { data, error: problem } = await db
		.from('office_history')
		.select('revision,status,action,note,actor_name,created_at')
		.eq('status', 'published')
		.order('revision', { ascending: false })
		.limit(50);
	databaseError(problem);
	return { history: (data ?? []) as OfficeRevision[] };
};

export const actions = {
	open: (event) =>
		attempt(async () => {
			const { db } = officeAccess(event);
			const revision = Number((await event.request.formData()).get('revision'));
			if (!Number.isInteger(revision)) error(400, 'Choose a revision.');
			const { data, error: problem } = await db
				.from('office_history')
				.select('document')
				.eq('revision', revision)
				.eq('status', 'published')
				.single();
			databaseError(problem);
			if (!data) error(404, 'That revision is no longer kept.');
			return { revision, document: data.document as OfficeDocument };
		})
};
