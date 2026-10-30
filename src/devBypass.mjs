// Local test mode: skip sign-in with a fake user. Only checked when the page is
// opened on localhost, and only enabled when the backend confirms it for this
// request (backend .env CLIPFORGE_DEV_BYPASS=1, never on Render).
export const DEV_TOKEN = 'clipforge-dev-bypass';
export const DEV_USER = {id: '00000000-0000-4000-8000-00000000de70', email: 'dev@localhost.test'};

let active = false;
export const devBypassActive = () => active;

export function loopbackHost(hostname) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}

export async function detectDevBypass(api, hostname, fetcher = fetch) {
  active = false;
  if (!api || !loopbackHost(hostname)) return false;
  try {
    const response = await fetcher(`${api}/dev/bypass`, {headers: {Authorization: `Bearer ${DEV_TOKEN}`}});
    active = response.ok && (await response.json()).enabled === true;
  } catch {
    active = false;
  }
  return active;
}

// Stands in for supabase: a signed-in session whose token the local backend
// accepts, and history queries that return nothing.
export function devSupabase() {
  const session = {access_token: DEV_TOKEN, user: DEV_USER};
  const empty = {data: [], error: null};
  const query = {select: () => query, eq: () => query, order: () => query, limit: () => query,
    then: (resolve, reject) => Promise.resolve(empty).then(resolve, reject)};
  return {
    auth: {
      getSession: async () => ({data: {session}, error: null}),
      getUser: async () => ({data: {user: DEV_USER}, error: null}),
      onAuthStateChange: () => ({data: {subscription: {unsubscribe() {}}}}),
      signOut: async () => ({error: null}),
    },
    from: () => query,
  };
}
