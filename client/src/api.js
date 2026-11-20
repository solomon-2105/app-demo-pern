const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const e = data?.error;
    const msg = e?.details?.length
      ? e.details.map((d) => `${d.field}: ${d.message}`).join("; ")
      : e?.message;
    const err = new Error(msg || "Request failed");
    err.status = res.status;
    err.code = e?.code;
    if (res.status === 401 && e?.code === "UNAUTHENTICATED") {
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw err;
  }
  return data;
}