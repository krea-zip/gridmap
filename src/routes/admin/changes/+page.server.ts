// review and publish. the published catalogue streams in for comparison, so
// the page and its checks show at once; each review step is a form action.
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	attempt,
	officeAccess,
	officeRoles,
	publishDraft,
	publishedDocument,
	requestDeploy,
	reviewerRoles,
	transitionDraft
} from '$lib/server/office';

export const load = async (event) => {
	const { db } = await officeAccess(event, officeRoles);
	return { published: publishedDocument(db) };
};

// the revision the person reviewed, so a step never applies to a draft
// someone changed since
async function reviewed(request: Request) {
	const form = await request.formData();
	const revision = Number(form.get('revision'));
	if (!Number.isInteger(revision) || revision < 0) error(400, 'Reload the draft and try again.');
	return { revision, note: String(form.get('note') ?? '').slice(0, 2000) };
}

const PUBLISHERS = ['admin', 'publisher'] as const;

export const actions = {
	submit: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, officeRoles);
			const { revision, note } = await reviewed(event.request);
			await transitionDraft(db, revision, 'submitted', note);
			return { message: 'Sent for approval.' };
		}),

	approve: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, reviewerRoles);
			const { revision, note } = await reviewed(event.request);
			await transitionDraft(db, revision, 'approved', note);
			return { message: 'Approved. A publisher can now publish it.' };
		}),

	return: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, reviewerRoles);
			const { revision, note } = await reviewed(event.request);
			await transitionDraft(db, revision, 'draft', note);
			return { message: 'Sent back to draft.' };
		}),

	publish: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, [...PUBLISHERS]);
			const { revision } = await reviewed(event.request);
			const release = await publishDraft(db, revision);
			return requestDeploy(db, release, env.VERCEL_DEPLOY_HOOK);
		}),

	redeploy: (event) =>
		attempt(async () => {
			const { db } = await officeAccess(event, [...PUBLISHERS]);
			const { data } = await db.from('office_workspace').select('published_release').single();
			if (!data?.published_release) error(400, 'There is no published release to deploy.');
			return requestDeploy(db, data.published_release, env.VERCEL_DEPLOY_HOOK);
		})
};
