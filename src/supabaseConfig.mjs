// Public Supabase settings are baked in at build time; without them sign-in cannot work.
export function supabaseConfigError(env) {
  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(name => !String(env?.[name] || '').trim());
  if (!missing.length) return null;
  return `ClipForge can't start because its sign-in settings are missing (${missing.join(', ')}). ` +
    'Add them to the frontend environment and rebuild.';
}
