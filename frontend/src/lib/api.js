function getCookie(name) {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return "";
}

async function request(path, options = {}) {
  const method = options.method || "GET";

  const headers = {
    ...(options.headers || {}),
  };

  if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    headers["X-CSRFToken"] = getCookie("csrftoken");
  }

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;

    if (detail) {
      throw new Error(String(detail));
    }

    if (data && typeof data === "object") {
      const messages = Object.entries(data)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");

      throw new Error(messages);
    }

    throw new Error(`Permintaan gagal (${response.status}).`);
  }

  return data;
}

export const api = {
  get(path) {
    return request(path);
  },

  post(path, data) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  upload(path, formData) {
    return request(path, {
      method: "POST",
      body: formData,
    });
  },
};
