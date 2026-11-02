// saving the shared draft. it's one json document edited in the browser,
// so it's posted whole, past what a form field comfortably carries; the
// revision number stops two people overwriting each other. review and
// publishing are form actions on /admin/changes.
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { checkedDocument, databaseError, officeAccess, officeBody, officeRoles } from '$lib/server/office';

export async function POST(event: RequestEvent) {
	const { db } = await officeAccess(event, officeRoles);
	const body = await officeBody(event);
	const revision = Number(body.revision);
	if (!Number.isInteger(revision) || revision < 0) error(400, 'Reload the draft before saving.');
	const note = typeof body.note === 'string' ? body.note : '';

	const document = checkedDocument(body.document);
	const { data, error: problem } = await db.rpc('office_save', {
		p_document: document,
		p_revision: revision,
		p_note: note
	});
	databaseError(problem);
	return json(data);
}
