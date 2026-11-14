import "server-only";

/** The MamaLine API, reached only from this app's server (never from the browser). */
export const API_URL = (process.env.MAMALINE_API_URL ?? "http://localhost:3010").replace(/\/$/, "");
export const SESSION_COOKIE = "ml_session";
export const SESSION_MAX_AGE = 7 * 24 * 3600; // matches the API session lifetime
