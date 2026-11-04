import { error, json } from '@sveltejs/kit';
import { studentClient } from '$lib/server/studentAuth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!/^[a-f0-9-]{36}$/i.test(event.params.id)) error(404, 'This link is unavailable or has been disabled.');
	const client = studentClient(event);
	const { data, error: failure } = await client.rpc('read_plan_share', { share_id: event.params.id });
	if (failure) error(503, 'This shared plan could not be loaded. Try again shortly.');
	if (!data?.length) error(404, 'This link is unavailable or has been disabled.');
	return json(data[0]);
};
