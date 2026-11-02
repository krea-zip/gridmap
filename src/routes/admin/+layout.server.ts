// the office opens rendered: who's signed in, their role and the shared
// draft are read here on the server, once per visit. moving between office
// pages reuses this; `office:workspace` reloads it when asked (a conflict,
// a sign-out). staff data, so it's never cached.
import { loadWorkspace, officeSession } from '$lib/server/office';

export const load = async (event) => {
	event.depends('office:workspace');
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const session = await officeSession(event);
	if (session.state !== 'ok') return { session: { state: session.state }, workspace: null };
	const { db, role, email } = session;
	return { session: { state: session.state, role, email }, workspace: await loadWorkspace(db, role, email) };
};
