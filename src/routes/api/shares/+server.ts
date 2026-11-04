import { error, json } from '@sveltejs/kit';
import { requireStudent, requestDocument } from '$lib/server/studentAuth';
import { planDocument } from '$lib/features/plans/document';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { client } = await requireStudent(event);
	const { data, error: failure } = await client
		.from('plan_shares')
		.select('id, name, created_at')
		.order('created_at', { ascending: false });
	if (failure) error(503, 'Share links could not be loaded.');
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const body = await requestDocument(event);
	const { client, user } = await requireStudent(event);
	let snapshot;
	try {
		snapshot = planDocument(body.snapshot);
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Invalid plan.');
	}
	const { data, error: failure } = await client
		.from('plan_shares')
		.insert({ user_id: user.id, snapshot })
		.select('id, name, created_at')
		.single();
	if (failure) error(503, 'A share link could not be created. Please try again.');
	return json(data, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const body = await requestDocument(event);
	const { client } = await requireStudent(event);
	if (typeof body.id !== 'string') error(400, 'Invalid share link.');
	const { error: failure } = await client.from('plan_shares').delete().eq('id', body.id);
	if (failure) error(503, 'This link could not be disabled.');
	return json({ ok: true });
};
