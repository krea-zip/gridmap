// the academic office's server side: who may do what, reading the shared
// draft, and turning database failures into messages staff can act on.
// every office route and load goes through here, so access is checked in
// one place. row-level security in supabase is the real guard; these checks
// give a clear error before the database refuses.
import { error, type RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	makeOfficeDocument,
	type OfficeDocument,
	type OfficeRole,
	type WorkspacePayload
} from '$lib/features/office/model';
import { documentShape, validateOffice } from '$lib/features/office/validation';
import type { CurriculumSnapshot } from '$lib/curriculum/snapshot';
import snapshot from '$lib/data/curriculum.json';
import descriptions from '$lib/data/course-descriptions.json';

/** everyone who edits; a contributor only sends requests */
export const officeRoles: OfficeRole[] = ['admin', 'publisher', 'reviewer', 'editor'];
export const reviewerRoles: OfficeRole[] = ['admin', 'publisher', 'reviewer'];

export type OfficeSession =
	| { state: 'signed-out' }
	| { state: 'no-access'; email: string }
	| { state: 'ok'; db: SupabaseClient; email: string; userId: string; role: OfficeRole };

// the office tables aren't in the generated types yet (see docs/backend.md)
const database = (event: RequestEvent) => event.locals.supabase as SupabaseClient | null;

/** who is signed in and their office role, without throwing, for page loads
 *  that show a sign-in screen rather than an error */
export async function officeSession(event: RequestEvent): Promise<OfficeSession> {
	const db = database(event);
	if (!db) error(503, 'The academic office needs Supabase. Set PUBLIC_SUPABASE_URL and its key in Vercel.');
	const user = await event.locals.getUser();
	if (!user) return { state: 'signed-out' };
	const { data: role, error: problem } = await db.rpc('office_role');
	if (problem) error(503, 'The academic-office database needs its setup migration. Your catalogue is unchanged.');
	const email = user.email ?? '';
	return role ? { state: 'ok', db, email, userId: user.id, role } : { state: 'no-access', email };
}

/** the session for an action or endpoint, refused unless the role may do it */
export async function officeAccess(event: RequestEvent, roles?: OfficeRole[]) {
	const session = await officeSession(event);
	if (session.state === 'signed-out') error(401, 'Sign in with your staff account to open the academic office.');
	if (session.state === 'no-access' || (roles && !roles.includes(session.role)))
		error(403, 'Your account does not have access to this action.');
	return session;
}

/** the shared draft as the office opens it. a contributor gets the published
 *  catalogue to refer to, never the draft in progress */
export async function loadWorkspace(db: SupabaseClient, role: OfficeRole, email: string): Promise<WorkspacePayload> {
	const { data: member } = await db
		.from('office_staff')
		.select('department')
		.eq('email', email.toLowerCase())
		.maybeSingle();
	const department = member?.department ?? '';
	const fresh = async () => ({ document: await publishedOffice(db), revision: 0, status: 'draft' });
	if (role === 'contributor') return { ...(await fresh()), department, deployment: '', release: '' };

	const { data, error: problem } = await db.from('office_workspace').select('*').maybeSingle();
	databaseError(problem);
	const draft = data ?? (await fresh());
	return {
		document: draft.document,
		revision: draft.revision,
		status: draft.status,
		department,
		deployment: data?.deployment_message ?? '',
		release: data?.published_release ?? ''
	};
}

/** a json request body, refused past vercel's request limit with advice */
export async function officeBody(event: RequestEvent): Promise<Record<string, unknown>> {
	const text = await event.request.text();
	if (new TextEncoder().encode(text).length > 4_000_000)
		error(
			413,
			'This draft exceeds the 4 MB request limit. Export old source sheets and remove them from the draft first.'
		);
	try {
		const body = JSON.parse(text);
		if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
		return body;
	} catch {
		error(400, 'The request could not be read.');
	}
}

/** postgres errors the office expects: a stale revision and a role check */
export function databaseError(problem: { message: string; code?: string } | null) {
	if (!problem) return;
	if (problem.code === '40001') error(409, problem.message);
	if (problem.code === '42501') error(403, 'Your staff role cannot make this change.');
	error(400, problem.message);
}

export function checkedDocument(raw: unknown): OfficeDocument {
	if (!documentShape(raw)) error(400, 'This is not a valid academic-office document.');
	const issues = validateOffice(raw).filter((i) => i.severity === 'error' && i.area === 'Workspace');
	if (issues.length) error(400, issues[0].message);
	return raw;
}

// before anything is saved the draft starts from the current release, or
// the catalogue this build shipped with
async function publishedOffice(db: SupabaseClient): Promise<OfficeDocument> {
	const { data, error: problem } = await db
		.from('curriculum_releases')
		.select('snapshot')
		.eq('is_current', true)
		.maybeSingle();
	databaseError(problem);
	const published = data?.snapshot as (CurriculumSnapshot & { descriptions?: Record<string, string> }) | undefined;
	return makeOfficeDocument(
		published ?? (snapshot as unknown as CurriculumSnapshot),
		published?.descriptions ?? descriptions
	);
}
