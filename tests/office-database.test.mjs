import { beforeAll as before, afterAll as after, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// the academic office's functions once it signs in with a shared password:
// only the server's secret key (service_role) may call them, and the name
// typed at sign-in lands in the history
const db = new PGlite();
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const { release: _compiledRelease, ...compiled } = await read('../src/lib/data/curriculum.json');
const descriptions = await read('../src/lib/data/course-descriptions.json');
const document = { format: '1', curriculum: compiled, descriptions };

before(async () => {
	await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls; -- as in supabase: the secret key skips row security
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
  `);
	for (const migration of [
		'202611010001_curriculum.sql',
		'202611020001_academic_office.sql',
		'202611030002_office_password.sql',
		'202611040002_batch_profiles.sql'
	])
		await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
	await db.exec('grant select on all tables in schema public to service_role');
});
after(() => db.close());

/** run as a database role; every test rolls back */
async function as(role, run) {
	await db.exec('begin');
	try {
		await db.exec(`set local role ${role}`);
		return await run();
	} finally {
		await db.exec('rollback');
	}
}

const refused = async (role, sql, params) =>
	as(role, async () => {
		await assert.rejects(db.query(sql, params), /permission denied/);
	});

test('students and visitors cannot call the office functions', async () => {
	for (const role of ['anon', 'authenticated']) {
		await refused(role, 'select public.office_save($1, 0, $2, $3)', [document, 'x', 'x']);
		await refused(role, 'select public.office_publish(1, $1)', ['x']);
		await refused(role, "select public.office_deployment('r', 'requested', 'x')");
	}
});

test("a batch's offers reach the release, and its private record does not", async () => {
	const profile = {
		batch: 2027,
		offers: { philosophy: { major: true } },
		note: 'private note',
		changes: [{ id: '1', title: 'Philosophy major approved', detail: 'senate minutes' }]
	};
	const curriculum = {
		...compiled,
		batchProfiles: [profile, { batch: 2028, offers: {}, note: 'nothing yet', changes: [] }]
	};
	await as('service_role', async () => {
		await db.query('select public.office_save($1, 0, $2, $3)', [{ ...document, curriculum }, 'batches', 'Priya']);
		await db.query('select public.office_publish(1, $1)', ['Priya']);
		const {
			rows: [{ snapshot }]
		} = await db.query('select snapshot from public.curriculum_releases where is_current');
		assert.deepEqual(snapshot.batchProfiles, [{ batch: 2027, offers: { philosophy: { major: true } } }]);
	});
});

test('the server saves and publishes, and the history names who did it', async () => {
	await as('service_role', async () => {
		const {
			rows: [{ saved }]
		} = await db.query('select public.office_save($1, 0, $2, $3) as saved', [document, 'first save', 'Priya']);
		assert.equal(saved.revision, 1);
		assert.equal(saved.updated_by_name, 'Priya');

		// someone else saved in between: a stale revision is refused
		await db.exec('savepoint stale');
		await assert.rejects(db.query('select public.office_save($1, 0, $2, $3)', [document, '', 'Arjun']), /Reload/);
		await db.exec('rollback to savepoint stale');

		const {
			rows: [{ release }]
		} = await db.query('select public.office_publish(1, $1) as release', ['Arjun']);
		const { rows: current } = await db.query('select id from public.curriculum_releases where is_current');
		assert.deepEqual(
			current.map((r) => r.id),
			[release]
		);

		const { rows: history } = await db.query(
			'select revision, action, actor_name from public.office_history order by revision'
		);
		assert.deepEqual(history, [
			{ revision: 1, action: 'saved', actor_name: 'Priya' },
			{ revision: 2, action: 'published', actor_name: 'Arjun' }
		]);
	});
});
