/**
 * Leave apiBaseUrl empty: in dev, `ng serve` proxies `/api` to Flask (see proxy.conf.json).
 * Keep the API running on port 5001: `cd backend && python app.py`
 */
export const environment = {
  production: false,
  apiBaseUrl: '',
};
