import { redirect } from '@sveltejs/kit';
import { studentClient } from '$lib/server/studentAuth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	if (code) {
		const client = studentClient(event);
		const { error } = await client.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, '/?account=welcome');
	}
	redirect(303, '/?account=error');
};
