// the academic office's server side: the shared-password session, reading
// the shared draft, and turning database failures into messages staff can
// act on. every office route and load goes through here, so access is
// checked in one place. the database client holds the project's secret key,
// so it lives only on the server and only after the password checks out.
import { error, fail, isHttpError, type RequestEvent } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { makeOfficeDocument, type OfficeDocument, type WorkspacePayload } from '$lib/features/office/model';
import { documentShape, validateOffice } from '$lib/features/office/validation';
import type { CurriculumSnapshot } from '$lib/curriculum/snapshot';
import { signedInName } from '$lib/server/officeAuth';
import snapshot from '$lib/data/curriculum.json';
import descriptions from '$lib/data/course-descriptions.json';

export type OfficeSession = { state: 'signed-out' } | { state: 'ok'; db: SupabaseClient; name: string };

let client: SupabaseClient | undefined;

/** the shared password and the secret-key client, or a plain error saying
 *  what vercel is missing */
export function officeConfig() {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SECRET_KEY;
	const password = env.ADMIN_PASSWORD;
	if (!url || !key || !password)
		error(503, 'The academic office needs PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and ADMIN_PASSWORD set in Vercel.');
	client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
	return { db: client, password };
}

/** who is signed in, without throwing, for page loads that show the
 *  sign-in screen rather than an error */
export function officeSession(event: RequestEvent): OfficeSession {
	const { db, password } = officeConfig();
	const name = signedInName(event.cookies, password);
	return name ? { state: 'ok', db, name } : { state: 'signed-out' };
}

/** the session for an action or endpoint, refused when signed out */
export function officeAccess(event: RequestEvent) {
	const session = officeSession(event);
	if (session.state === 'signed-out') error(401, 'Sign in to the academic office first.');
	return session;
}

/** the shared draft as the office opens it */
export async function loadWorkspace(db: SupabaseClient): Promise<WorkspacePayload> {
	const { data, error: problem } = await db.from('office_workspace').select('*').maybeSingle();
	databaseError(problem);
	const draft = data ?? { document: await publishedOffice(db), revision: 0, status: 'draft' };
	return {
		document: draft.document,
		revision: draft.revision,
		status: draft.status,
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

/** postgres errors the office expects: a stale revision first */
export function databaseError(problem: { message: string; code?: string } | null) {
	if (!problem) return;
	if (problem.code === '40001') error(409, problem.message);
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

/** publish the saved revision as the new release; the database builds the
 *  public snapshot, so office-only notes never leave it */
export async function publishDraft(db: SupabaseClient, revision: number, name: string): Promise<string> {
	const { data, error: problem } = await db.from('office_workspace').select('document,revision').single();
	databaseError(problem);
	if (!data || data.revision !== revision) error(409, 'The draft changed. Reload it before publishing.');
	const issues = validateOffice(data.document).filter((i) => i.severity === 'error');
	if (issues.length) error(400, `Resolve ${issues.length} errors before publishing.`);
	const result = await db.rpc('office_publish', { p_revision: revision, p_actor: name });
	databaseError(result.error);
	return result.data;
}

/** ask vercel to rebuild the site with the release. the build pulls the
 *  current release from supabase (npm run curriculum:pull), so students see
 *  it once the deploy finishes; the live site stays up meanwhile */
export async function requestDeploy(db: SupabaseClient, release: string, hook: string | undefined) {
	let status: 'requested' | 'failed' | 'not-configured' = 'not-configured';
	let message = 'Published in Supabase. Add VERCEL_DEPLOY_HOOK in Vercel to update the website automatically.';
	if (hook) {
		try {
			const url = new URL(hook);
			// only ever post to vercel: the hook is a secret url, not a free fetch
			if (url.protocol !== 'https:' || url.hostname !== 'api.vercel.com') throw Error('not a vercel hook');
			const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(15000) });
			if (!response.ok) throw Error('deploy request failed');
			status = 'requested';
			message = 'Website update requested. The current website stays available while Vercel builds this release.';
		} catch {
			status = 'failed';
			message = 'Published in Supabase, but the website update could not be requested. Retry the website update.';
		}
	}
	const { error: problem } = await db.rpc('office_deployment', {
		p_release: release,
		p_status: status,
		p_message: message
	});
	databaseError(problem);
	return { status, message };
}

/** the catalogue students see now, as an office document to compare against */
export async function publishedDocument(db: SupabaseClient): Promise<OfficeDocument> {
	return publishedOffice(db);
}

/** run an office step inside a form action: a refusal (signed out, a stale
 *  revision, errors in the draft) comes back as the form's message instead
 *  of an error page, so staff stay where they were */
export async function attempt<T>(step: () => Promise<T>) {
	try {
		return await step();
	} catch (e) {
		if (isHttpError(e)) return fail(e.status, { message: e.body.message });
		throw e;
	}
}
