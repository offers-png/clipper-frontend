export async function sessionHeaders(auth) {
  const {data, error} = await auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Please sign in again to verify your subscription.');
  return {Authorization: `Bearer ${data.session.access_token}`};
}

export async function verifyBilling(auth, api, sessionId = null, fetcher = fetch, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutError = new Error('Subscription verification timed out. Retry verification; do not pay again.');
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { reject(timeoutError); controller.abort(); }, timeoutMs);
  });
  const request = async () => {
    const headers = await sessionHeaders(auth);
    if (controller.signal.aborted) throw timeoutError;
    // Empty browser multipart forms crash the production-pinned legacy parser.
    const body = new URLSearchParams();
    if (sessionId) body.append('session_id', sessionId);
    const response = await fetcher(`${api}/billing/check-access`, {method:'POST', headers, body, signal:controller.signal});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Subscription verification is unavailable. Do not pay again.');
    return result;
  };
  try { return await Promise.race([request(), deadline]); }
  finally { clearTimeout(timer); }
}

export function verifiedPaid(result) {
  return result?.allowed === true && result?.plan === 'active' && result?.payment_verified === true;
}

export function ownerDevelopment(result) {
  return result?.allowed === true && result?.plan === 'owner_development' && result?.owner_development === true;
}

export function billingAction(result) {
  if (ownerDevelopment(result)) return 'owner';
  if (verifiedPaid(result)) return 'paid';
  if (result?.plan === 'trial' && result?.existing_subscription === true && result?.subscription_status === 'trialing') return 'trial';
  return ['trial', 'expired', 'cancelled', 'none'].includes(result?.plan) ? 'upgrade' : 'verify';
}
