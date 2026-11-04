import { beforeAll, afterAll, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const snapshot = {
	version: 1,
	placements: { '2-1': ['MATH201', 'COMP201~1'] },
	picks: { major1: 'mathematics' },
	grades: { MATH201: 'A' },
	email: 'private@krea.ac.in',
	audited: ['MATH201'],
	fourYear: true,
	structure: 'major-minor',
	batchStartYear: 2025
};
let share;
beforeAll(async () => {
	await db.exec(`
		create role anon; create role authenticated; create schema auth;
		create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
		create table auth.identities (user_id uuid, provider text, identity_data jsonb);
		create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
		grant usage on schema auth to anon, authenticated;
		grant execute on function auth.uid() to anon, authenticated;
	`);
	for (const [n, email] of [
		[1, 'one@krea.ac.in'],
		[2, 'two@krea.ac.in'],
		[3, 'outsider@gmail.com'],
		[4, 'one@krea.ac.in.evil.test']
	]) {
		await db.query('insert into auth.users values ($1,$2,now())', [id(n), email]);
		await db.query("insert into auth.identities values ($1,'google',$2)", [id(n), { email }]);
	}
	for (const file of [
		'202610290001_course_reviews.sql',
		'202610310001_private_plans.sql',
		'202611040001_student_sharing.sql'
	]) {
		await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
	}
	share = (await db.query('insert into plan_shares (user_id,snapshot) values ($1,$2) returning *', [id(1), snapshot]))
		.rows[0];
	await db.query("insert into plans (user_id,name,snapshot) values ($1,'Private plan',$2)", [id(1), snapshot]);
});
afterAll(() => db.close());
async function as(role, user, run) {
	await db.exec('begin');
	try {
		await db.exec(`set local role ${role}`);
		await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user || '']);
		return await run();
	} finally {
		await db.exec('rollback');
	}
}

test('share payload strips grades, account information and failed attempts at the database boundary', async () => {
	await as('anon', null, async () => {
		const row = (await db.query('select * from read_plan_share($1)', [share.id])).rows[0];
		assert.deepEqual(Object.keys(row).sort(), ['created_at', 'name', 'snapshot']);
		assert.deepEqual(row.snapshot.placements, { '2-1': ['MATH201'] });
		assert.deepEqual(row.snapshot.audited, ['MATH201']);
		assert.equal(row.snapshot.grades, undefined);
		assert.equal(row.snapshot.email, undefined);
		assert.equal(row.name, 'Shared plan');
	});
	await assert.rejects(as('anon', null, () => db.query('select * from plan_shares')));
	await assert.rejects(as('anon', null, () => db.query('select * from plans')));
});

test('only Krea Google identities can create plans and shares, and neither is visible to other users', async () => {
	for (const n of [3, 4]) {
		await assert.rejects(
			as('authenticated', id(n), () =>
				db.query('insert into plan_shares (user_id,snapshot) values ($1,$2)', [id(n), snapshot])
			)
		);
		await assert.rejects(
			as('authenticated', id(n), () =>
				db.query("insert into plans (user_id,name,snapshot) values ($1,'No',$2)", [id(n), snapshot])
			)
		);
	}
	await as('authenticated', id(2), async () => {
		assert.equal((await db.query('select * from plans')).rows.length, 0);
		assert.equal((await db.query('select * from plan_shares')).rows.length, 0);
		assert.equal((await db.query('delete from plan_shares where id=$1 returning id', [share.id])).rows.length, 0);
		await db.query("insert into plans (user_id,name,snapshot) values ($1,'Copied',$2)", [id(2), share.snapshot]);
		assert.equal((await db.query('select * from plans')).rows.length, 1);
	});
	await assert.rejects(
		as('authenticated', id(2), () =>
			db.query('insert into plan_shares (user_id,snapshot) values ($1,$2)', [id(1), snapshot])
		)
	);
	await assert.rejects(
		as('authenticated', id(1), () => db.query("update plan_shares set snapshot='{}' where id=$1", [share.id]))
	);
});

test('owner can disable a link immediately; unknown and disabled links return no data', async () => {
	await as('authenticated', id(1), async () => {
		assert.equal((await db.query('select * from plan_shares')).rows.length, 1);
		await db.query('delete from plan_shares where id=$1', [share.id]);
		assert.equal((await db.query('select * from read_plan_share($1)', [share.id])).rows.length, 0);
	});
	await as('anon', null, async () =>
		assert.equal((await db.query('select * from read_plan_share($1)', [id(99)])).rows.length, 0)
	);
});
