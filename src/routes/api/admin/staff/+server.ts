import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { officeAccess, officeBody, databaseError } from '$lib/server/office';
export async function GET(event: RequestEvent) {
	const { db } = await officeAccess(event, ['admin']);
	const { data, error: problem } = await db.from('office_staff').select('*').order('email');
	databaseError(problem);
	return json(data, { headers: { 'cache-control': 'no-store' } });
}
export async function POST(event: RequestEvent) {
	const { db, email: own } = await officeAccess(event, ['admin']);
	const b = await officeBody(event);
	const email = String(b.email ?? '')
		.trim()
		.toLowerCase();
	const role = String(b.role ?? '');
	if (
		!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email) ||
		!['admin', 'publisher', 'reviewer', 'editor', 'contributor'].includes(role)
	)
		error(400, 'Enter a valid email address and staff role.');
	if (email === own.toLowerCase() && (b.active === false || role !== 'admin'))
		error(400, 'Ask another administrator to change your own access.');
	const department = typeof b.department === 'string' && b.department ? b.department : null;
	if (role === 'contributor' && !department) error(400, 'Select the contributor’s department.');
	const { error: problem } = await db
		.from('office_staff')
		.upsert({ email, role, department, active: b.active !== false });
	databaseError(problem);
	return json({ ok: true });
}
