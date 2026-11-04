// signing in to and out of the academic office. a wrong password waits a
// second before answering, so guessing it is slow
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { officeConfig, officeBody } from '$lib/server/office';
import { NAME_MAX, passwordMatches, signIn, signOut } from '$lib/server/officeAuth';

export async function POST(event: RequestEvent) {
	const { password } = officeConfig();
	const body = await officeBody(event);
	const name = typeof body.name === 'string' ? body.name.trim().slice(0, NAME_MAX) : '';
	const given = typeof body.password === 'string' ? body.password : '';
	if (!name) error(400, 'Enter your name.');
	if (!passwordMatches(password, given)) {
		await new Promise((done) => setTimeout(done, 1000));
		error(401, "That password isn't right.");
	}
	signIn(event.cookies, password, name);
	return json({ name });
}

export function DELETE(event: RequestEvent) {
	signOut(event.cookies);
	return new Response(null, { status: 204 });
}
