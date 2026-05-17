/**
 * Dejá apiBaseUrl vacío: en dev, `ng serve` reenvía /api al Flask (ver proxy.conf.json).
 * El API debe seguir en marcha en el puerto 5001: `cd backend && python app.py`
 */
export const environment = {
  production: false,
  apiBaseUrl: '',
};
