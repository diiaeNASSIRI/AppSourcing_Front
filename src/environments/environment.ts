// Environment de développement (ng serve)
// On aligne sur la prod: toutes les requêtes passent par /api
// Ajuste proxy.conf.json si besoin (context doit inclure /api)
export const environment = {
	production: false,
	apiUrl: 'https://api.appsourciing.com/api'
};

export type Environment = typeof environment;
