import { building } from '$app/environment';
import { env } from '$env/dynamic/public';

export function supabaseConfig(): { url: string; key: string } | null {
	if (building) return null;
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	return url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_KEY') ? { url, key } : null;
}

export const supabaseConfigured = () => supabaseConfig() !== null;
