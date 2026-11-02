// department requests: a contributor asks for a course change, the office
// answers. contributors see their own requests (row-level security), staff
// see all of them.
import { error } from '@sveltejs/kit';
import { attempt, databaseError, officeAccess, reviewerRoles } from '$lib/server/office';
import type { Submission } from '$lib/features/office/model';

const RESPONSES = ['submitted', 'clarification', 'accepted', 'declined'];
const text = (form: FormData, key: string, max: number) =>
	String(form.get(key) ?? '')
		.trim()
		.slice(0, max);

export const load = async (event) => {
	const { db } = await officeAccess(event);
	const { data, error: problem } = await db
		.from('office_submissions')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(250);
	databaseError(problem);
	return { submissions: (data ?? []) as Submission[] };
};

export const actions = {
	request: (event) =>
		attempt(async () => {
			const { db, userId } = await officeAccess(event);
			const form = await event.request.formData();
			const request = text(form, 'request', 12000);
			if (!request) error(400, 'Describe the change you need.');
			const { error: problem } = await db.from('office_submissions').insert({
				author: userId,
				department: text(form, 'department', 200),
				course: text(form, 'course', 20).toUpperCase(),
				term: text(form, 'term', 20),
				request
			});
			databaseError(problem);
			return { message: 'Request sent to the academic office.' };
		}),

	respond: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, reviewerRoles);
			const form = await event.request.formData();
			const status = text(form, 'status', 20);
			if (!RESPONSES.includes(status)) error(400, 'Choose a response.');
			const { error: problem } = await db
				.from('office_submissions')
				.update({ status, response: text(form, 'response', 12000) })
				.eq('id', text(form, 'id', 64));
			databaseError(problem);
			return { message: 'Response saved.' };
		})
};
