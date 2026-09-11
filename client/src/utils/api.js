// small helper so we don't copy paste the same fetch code everywhere
// change API_BASE to whatever your actual backend url is

const API_BASE = "http://localhost:5000/api";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  const body = await response.json();

  if (!response.ok) {
    // our api wraps errors in body.error.message, based on the envelope we used for categories
    throw new Error(body.error?.message || "something went wrong");
  }

  return body.data;
}

export default apiRequest;
