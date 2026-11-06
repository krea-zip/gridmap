import { json } from '@sveltejs/kit';
import { studentAccount } from '$lib/server/studentAuth';
import { supabaseConfigured } from '$lib/supabase/config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!supabaseConfigured()) {
		event.setHeaders({ 'cache-control': 'private, no-store' });
		return json({ configured: false, user: null, eligible: false });
	}
	const { user, eligible } = await studentAccount(event);
	return json({ configured: true, user: user ? { id: user.id, email: user.email } : null, eligible });
};
