import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
import type { Database } from './database.types';

let client: Promise<SupabaseClient<Database>> | undefined;

/** One lazy client, using PKCE and cookies shared with the callback and API. */
export function getSupabase(): Promise<SupabaseClient<Database>> {
	const config = supabaseConfig();
	if (!browser || !config) return Promise.reject(new Error('Sign-in is not available on this site yet.'));
	return (client ??= import('@supabase/ssr')
		.then(({ createBrowserClient }) => createBrowserClient<Database>(config.url, config.key))
		.catch((error) => {
			client = undefined;
			throw error;
		}));
}
