import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { officeAccess, officeRoles, databaseError } from '$lib/server/office';
export async function GET(event: RequestEvent) {
	const { db } = await officeAccess(event, officeRoles);
	const revision = event.url.searchParams.get('revision');
	if (revision) {
		if (!/^\d+$/.test(revision)) error(400, 'Invalid revision.');
		const { data, error: problem } = await db
			.from('office_history')
			.select('*')
			.eq('revision', Number(revision))
			.single();
		databaseError(problem);
		return json(data, { headers: { 'cache-control': 'no-store' } });
	}
	const { data, error: problem } = await db
		.from('office_history')
		.select('revision,status,action,note,actor,created_at')
		.order('revision', { ascending: false })
		.limit(100);
	databaseError(problem);
	return json(data, { headers: { 'cache-control': 'no-store' } });
}
