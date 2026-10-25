export async function sessionHeaders(auth) {
  const {data, error} = await auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Please sign in again to verify your subscription.');
  return {Authorization: `Bearer ${data.session.access_token}`};
}

export async function verifyBilling(auth, api, sessionId = null, fetcher = fetch) {
  const headers = await sessionHeaders(auth);
  const body = new FormData();
  if (sessionId) body.append('session_id', sessionId);
  const response = await fetcher(`${api}/billing/check-access`, {method:'POST', headers, body});
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Subscription verification is unavailable. Do not pay again.');
  return result;
}

export function verifiedPaid(result) {
  return result?.allowed === true && result?.plan === 'active' && result?.payment_verified === true;
}
