// who can use the office, and as what. admins only: access is the one
// thing an editor must never be able to change for themselves.
import { error } from '@sveltejs/kit';
import { attempt, databaseError, officeAccess } from '$lib/server/office';
import type { OfficeRole, StaffMember } from '$lib/features/office/model';

const ROLES: OfficeRole[] = ['admin', 'publisher', 'reviewer', 'editor', 'contributor'];

export const load = async (event) => {
	const { db } = await officeAccess(event, ['admin']);
	const { data, error: problem } = await db.from('office_staff').select('*').order('email');
	databaseError(problem);
	return { staff: (data ?? []) as StaffMember[] };
};

export const actions = {
	save: (event) =>
		attempt(async () => {
			const { db, email: self } = await officeAccess(event, ['admin']);
			const form = await event.request.formData();
			const email = String(form.get('email') ?? '')
				.trim()
				.toLowerCase();
			const role = String(form.get('role') ?? '') as OfficeRole;
			const department = String(form.get('department') ?? '') || null;
			const active = form.get('active') !== null;
			if (!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email) || !ROLES.includes(role))
				error(400, 'Enter a valid email address and staff role.');
			// someone has to be able to undo a mistake, so no one locks themselves out
			if (email === self.toLowerCase() && (!active || role !== 'admin'))
				error(400, 'Ask another administrator to change your own access.');
			if (role === 'contributor' && !department) error(400, 'Select the contributor’s department.');
			const { error: problem } = await db.from('office_staff').upsert({ email, role, department, active });
			databaseError(problem);
			return { message: `Saved. ${email} can sign in as ${role}.` };
		})
};
