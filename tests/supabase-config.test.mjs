import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supabaseConfigError} from '../src/supabaseConfig.mjs';

test('missing Supabase settings produce a readable error naming each one',()=>{
  assert.match(supabaseConfigError({}),/VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY/);
  assert.match(supabaseConfigError({VITE_SUPABASE_URL:'https://x.supabase.co',VITE_SUPABASE_ANON_KEY:'  '}),/\(VITE_SUPABASE_ANON_KEY\)/);
  assert.equal(supabaseConfigError({VITE_SUPABASE_URL:'https://x.supabase.co',VITE_SUPABASE_ANON_KEY:'public-anon'}),null);
});

test('the app shows the error before loading code that creates the Supabase client',()=>{
  const entry=readFileSync(new URL('../src/StudioEntry.jsx',import.meta.url),'utf8');
  assert.match(entry,/supabaseConfigError\(import\.meta\.env\)/);
  assert.ok(entry.indexOf('if(configError)')<entry.indexOf('<Suspense'));
  const client=readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8');
  assert.match(client,/configError \? null : createClient/);
});
