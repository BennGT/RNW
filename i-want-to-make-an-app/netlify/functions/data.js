const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers,
        body: "",
      };
    }

    const store = await getBlobStore("marshal");
    const authStore = await getBlobStore("marshal-auth");
    const user = await getAuthenticatedUser(authStore, event.headers.authorization || event.headers.Authorization);

    if (!user) {
      return json(401, { error: "Sign in required" });
    }

    if (event.httpMethod === "GET") {
      const data = await store.get("shared-data", { type: "json" });
      return json(200, { data: data || null });
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const data = payload.data || payload;

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return json(400, { error: "Invalid data payload" });
      }

      await store.setJSON("shared-data", {
        ...data,
        cloudSavedAt: new Date().toISOString(),
      });

      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(500, {
      error: "Data function failed",
      detail: error.message,
      name: error.name,
    });
  }
};

async function getAuthenticatedUser(store, authHeader) {
  const token = readBearerToken(authHeader);
  if (!token) return null;

  const session = await store.get(`session:${token}`, { type: "json" });
  if (!session || new Date(session.expiresAt) < new Date()) {
    await store.delete(`session:${token}`).catch(() => {});
    return null;
  }

  const users = (await store.get("users", { type: "json" })) || [];
  const user = users.find((item) => item.id === session.userId);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function readBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

async function getBlobStore(name) {
  const { getStore } = await import("@netlify/blobs");
  return getStore(name);
}
