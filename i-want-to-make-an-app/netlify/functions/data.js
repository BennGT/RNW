const { getStore } = require("@netlify/blobs");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  const store = getStore("marshal");

  if (event.httpMethod === "GET") {
    const data = await store.get("shared-data", { type: "json" });
    return json(200, { data: data || null });
  }

  if (event.httpMethod === "POST") {
    try {
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
    } catch (error) {
      return json(400, { error: error.message });
    }
  }

  return json(405, { error: "Method not allowed" });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}
