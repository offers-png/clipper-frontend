export async function postForm(url, data) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, v));
  const r = await fetch(url, { method: "POST", body: fd });
  return r.json();
}
