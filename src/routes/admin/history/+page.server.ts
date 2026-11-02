// every save, review step and publish, newest first. any revision can be
// opened as an unsaved draft, which is how a mistake is rolled back.
import { error } from '@sveltejs/kit';
import { attempt, databaseError, officeAccess, officeRoles } from '$lib/server/office';
import type { OfficeDocument, OfficeRevision } from '$lib/features/office/model';

export const load = async (event) => {
	const { db } = await officeAccess(event, officeRoles);
	const { data, error: problem } = await db
		.from('office_history')
		.select('revision,status,action,note,actor,created_at')
		.order('revision', { ascending: false })
		.limit(100);
	databaseError(problem);
	return { history: (data ?? []) as OfficeRevision[] };
};

export const actions = {
	open: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, officeRoles);
			const revision = Number((await event.request.formData()).get('revision'));
			if (!Number.isInteger(revision)) error(400, 'Choose a revision.');
			const { data, error: problem } = await db
				.from('office_history')
				.select('document')
				.eq('revision', revision)
				.single();
			databaseError(problem);
			if (!data) error(404, 'That revision is no longer kept.');
			return { revision, document: data.document as OfficeDocument };
		})
};
