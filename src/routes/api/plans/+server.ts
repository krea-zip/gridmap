import { error, json } from '@sveltejs/kit';
import { requireStudent, requestDocument } from '$lib/server/studentAuth';
import { planDocument, planName } from '$lib/features/plans/document';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { client } = await requireStudent(event);
	const { data, error: failure } = await client.from('plans').select('*').order('updated_at', { ascending: false });
	if (failure) error(503, 'Saved plans could not be loaded. Please try again.');
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const body = await requestDocument(event);
	const { client, user } = await requireStudent(event);
	let name, snapshot;
	try {
		name = planName(typeof body.name === 'string' ? body.name : '');
		snapshot = planDocument(body.snapshot);
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Invalid plan.');
	}
	const { data, error: failure } = await client
		.from('plans')
		.insert({ user_id: user.id, name, snapshot })
		.select()
		.single();
	if (failure) error(503, 'This plan could not be saved. Your browser draft is still here.');
	return json(data, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const body = await requestDocument(event);
	const { client } = await requireStudent(event);
	if (typeof body.id !== 'string' || !Number.isInteger(body.revision)) error(400, 'Invalid saved plan.');
	const { data, error: failure } = await client
		.from('plans')
		.delete()
		.eq('id', body.id)
		.eq('revision', body.revision as number)
		.select('id');
	if (failure) error(503, 'This plan could not be deleted.');
	if (!data?.length) error(409, 'This plan changed on another device. Refresh your saved plans before deleting.');
	return json({ ok: true });
};
