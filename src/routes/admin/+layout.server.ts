// the office opens rendered: who's signed in and the shared draft are read
// here on the server, once per visit. moving between office pages reuses
// this; `office:workspace` reloads it when asked (a conflict, a sign-in or
// sign-out). staff data, so it's never cached.
import { loadWorkspace, officeSession } from '$lib/server/office';

export const load = async (event) => {
	event.depends('office:workspace');
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const session = officeSession(event);
	if (session.state !== 'ok') return { name: null, workspace: null };
	return { name: session.name, workspace: await loadWorkspace(session.db) };
};
