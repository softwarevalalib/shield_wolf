/**
 * Frontend environment helpers.
 * Only VITE_* variables are exposed to the browser.
 */
export const env = {
  appUrl: import.meta.env.VITE_APP_URL || '',
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
