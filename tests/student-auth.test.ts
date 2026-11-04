import { beforeEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
	createServerClient: () => ({
		auth: { getUser: mocks.getUser, exchangeCodeForSession: mocks.exchangeCodeForSession },
		rpc: mocks.rpc
	})
}));
vi.mock('$lib/infrastructure/supabase/config', () => ({
	supabaseConfig: () => ({ url: 'https://test.supabase.co', key: 'test' }),
	supabaseConfigured: () => true
}));
import { GET as account } from '../src/routes/api/account/+server';
import { GET as callback } from '../src/routes/auth/callback/+server';
import { requireStudent, requestDocument } from '../src/lib/server/studentAuth';

function event(path = '/api/account', request?: Request): RequestEvent {
	const headers = new Map<string, string>();
	return {
		url: new URL(path, 'https://kcal.test'),
		request: request ?? new Request('https://kcal.test' + path),
		cookies: { getAll: () => [], set: vi.fn() },
		setHeaders: (values: Record<string, string>) => {
			for (const [key, value] of Object.entries(values)) {
				if (headers.has(key)) throw new Error('Cannot set the same header twice');
				headers.set(key, value);
			}
		}
	} as unknown as RequestEvent;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
});

test('configured guest and member account responses use verified identities and private caching', async () => {
	expect(await (await account(event() as never)).json()).toEqual({ configured: true, user: null, eligible: false });
	mocks.getUser.mockResolvedValue({
		data: { user: { id: 'member', email: 'student@krea.ac.in', user_metadata: { secret: 'not returned' } } },
		error: null
	});
	mocks.rpc.mockResolvedValue({ data: true, error: null });
	expect(await (await account(event() as never)).json()).toEqual({
		configured: true,
		user: { id: 'member', email: 'student@krea.ac.in' },
		eligible: true
	});
	expect(mocks.rpc).toHaveBeenCalledWith('can_review');
});

test('private APIs reject guests, ineligible users and failed eligibility checks', async () => {
	await expect(requireStudent(event())).rejects.toMatchObject({ status: 401 });
	mocks.getUser.mockResolvedValue({ data: { user: { id: 'personal', email: 'student@krea.ac.in' } }, error: null });
	mocks.rpc.mockResolvedValue({ data: false, error: null });
	await expect(requireStudent(event())).rejects.toMatchObject({ status: 403 });
	mocks.rpc.mockResolvedValue({ data: null, error: { message: 'database unavailable' } });
	await expect(requireStudent(event())).rejects.toMatchObject({ status: 503 });
});

test('write boundary refuses cross-origin, oversized and malformed documents', async () => {
	const request = (body: string, origin = 'https://kcal.test') =>
		new Request('https://kcal.test/api/plans', { method: 'POST', headers: { origin }, body });
	await expect(requestDocument(event('/api/plans', request('{}', 'https://evil.test')))).rejects.toMatchObject({
		status: 403
	});
	await expect(requestDocument(event('/api/plans', request('x'.repeat(300001))))).rejects.toMatchObject({
		status: 413
	});
	await expect(requestDocument(event('/api/plans', request('[]')))).rejects.toMatchObject({ status: 400 });
	await expect(requestDocument(event('/api/plans', request('{')))).rejects.toMatchObject({ status: 400 });
	await expect(requestDocument(event('/api/plans', request('{"name":"A"}')))).resolves.toEqual({ name: 'A' });
});

test('OAuth callback exchanges the PKCE code and uses a fixed local destination', async () => {
	mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
	await expect(callback(event('/auth/callback?code=valid&next=https://evil.test') as never)).rejects.toMatchObject({
		status: 303,
		location: '/?account=welcome'
	});
	expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('valid');
	mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: 'expired' } });
	await expect(callback(event('/auth/callback?code=expired') as never)).rejects.toMatchObject({
		status: 303,
		location: '/?account=error'
	});
	await expect(callback(event('/auth/callback?error=access_denied') as never)).rejects.toMatchObject({
		status: 303,
		location: '/?account=error'
	});
});
