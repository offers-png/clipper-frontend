// /ask-ai returns {response} on success and {error} or {detail} (401/429/503) otherwise.
export function askAiReply(ok, data) {
  if (ok && typeof data?.response === 'string') return data.response;
  return data?.error || data?.detail || 'Error contacting AI.';
}
