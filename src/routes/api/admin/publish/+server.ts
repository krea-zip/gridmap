import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { officeAccess, officeBody, databaseError } from '$lib/server/office';
import { validateOffice } from '$lib/features/office/validation';
export async function POST(event: RequestEvent) {
	const { db } = await officeAccess(event, ['admin', 'publisher']);
	const b = await officeBody(event);
	let release: string;
	if (b.retry) {
		const { data, error: problem } = await db.from('office_workspace').select('published_release').single();
		databaseError(problem);
		if (!data?.published_release) error(400, 'There is no published release to deploy.');
		release = data.published_release;
	} else {
		const { data, error: problem } = await db.from('office_workspace').select('document,revision').single();
		databaseError(problem);
		if (data?.revision !== b.revision) error(409, 'The draft changed. Reload it before publishing.');
		const issues = validateOffice(data.document).filter((i) => i.severity === 'error');
		if (issues.length) error(400, `Resolve ${issues.length} errors before publishing.`);
		const result = await db.rpc('office_publish', { p_revision: b.revision });
		databaseError(result.error);
		release = result.data;
	}
	let status = 'not-configured',
		message = 'Saved in Supabase. Add the Vercel deploy hook to enable website updates.';
	if (env.VERCEL_DEPLOY_HOOK) {
		try {
			const url = new URL(env.VERCEL_DEPLOY_HOOK);
			if (url.protocol !== 'https:' || url.hostname !== 'api.vercel.com')
				throw Error('Invalid deployment configuration');
			const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(15000) });
			if (!response.ok) throw Error('Deployment request failed');
			status = 'requested';
			message = 'Website update requested. The current website stays available while Vercel builds this release.';
		} catch {
			status = 'failed';
			message = 'Saved in Supabase, but the website update could not be requested. Retry the website update.';
		}
	}
	const { error: problem } = await db.rpc('office_deployment', {
		p_release: release,
		p_status: status,
		p_message: message
	});
	databaseError(problem);
	return json({ release, status, message });
}
