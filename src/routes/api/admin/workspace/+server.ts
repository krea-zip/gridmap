// saving the shared draft, and moving it through review. the draft is one
// json document edited in the browser, so it's posted whole; the revision
// number guards against two people overwriting each other.
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { checkedDocument, databaseError, officeAccess, officeBody, officeRoles } from '$lib/server/office';
import { validateOffice } from '$lib/features/office/validation';

const REVIEW_STATES = ['draft', 'submitted', 'approved'];

export async function POST(event: RequestEvent) {
	const { db } = await officeAccess(event, officeRoles);
	const body = await officeBody(event);
	const revision = Number(body.revision);
	if (!Number.isInteger(revision) || revision < 0) error(400, 'Reload the draft before saving.');
	const note = typeof body.note === 'string' ? body.note : '';

	if (body.action === 'transition') {
		const status = String(body.status);
		if (!REVIEW_STATES.includes(status)) error(400, 'Unknown review action.');
		// nothing broken goes up for approval
		if (status !== 'draft') {
			const { data, error: readError } = await db.from('office_workspace').select('document').maybeSingle();
			databaseError(readError);
			const issues = validateOffice(data?.document).filter((i) => i.severity === 'error');
			if (issues.length)
				error(400, `Resolve ${issues.length} errors before submitting or approving. ${issues[0].message}`);
		}
		const { data, error: problem } = await db.rpc('office_transition', {
			p_revision: revision,
			p_status: status,
			p_note: note
		});
		databaseError(problem);
		return json(data);
	}

	const document = checkedDocument(body.document);
	const { data, error: problem } = await db.rpc('office_save', {
		p_document: document,
		p_revision: revision,
		p_note: note
	});
	databaseError(problem);
	return json(data);
}
