// Environment de production
// On normalise toutes les requêtes API sous le préfixe /api.
// Nginx doit avoir: location /api/ { proxy_pass http://127.0.0.1:5470/; }
export const environment = {
	production: true,
	apiUrl: '/api'
};

export type Environment = typeof environment;
