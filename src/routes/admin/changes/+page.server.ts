// publish. the published catalogue streams in for comparison, so the page
// and its checks show at once; publishing is a form action.
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { attempt, officeAccess, publishDraft, publishedDocument, requestDeploy } from '$lib/server/office';

export const load = async (event) => {
	const { db } = officeAccess(event);
	return { published: publishedDocument(db) };
};

// the revision the person looked at, so publishing never applies to a draft
// someone changed since
async function reviewed(request: Request) {
	const revision = Number((await request.formData()).get('revision'));
	if (!Number.isInteger(revision) || revision < 0) error(400, 'Reload the draft and try again.');
	return revision;
}

export const actions = {
	publish: (event) =>
		attempt(async () => {
			const { db, name } = officeAccess(event);
			const release = await publishDraft(db, await reviewed(event.request), name);
			return requestDeploy(db, release, env.DEPLOY_HOOK_URL);
		}),

	redeploy: (event) =>
		attempt(async () => {
			const { db } = officeAccess(event);
			const { data } = await db.from('office_workspace').select('published_release').single();
			if (!data?.published_release) error(400, 'There is no published release to deploy.');
			return requestDeploy(db, data.published_release, env.DEPLOY_HOOK_URL);
		})
};
