var pg = require('pg');

module.exports = {
	getConnection: () => {
		var dbUrl;

		if(process.env.DATABASE_URL){
			dbUrl = process.env.DATABASE_URL
		} else {
			dbUrl = {
				user: process.env.POSTGRES_USER,
				password: process.env.POSTGRES_PASSWORD,
				database: 'weight_loss',
				host: 'localhost',
				port: 5432
			};
		}

		return new pg.Client(dbUrl);
	},
	retrieveDbUrl: () => {
		return process.env.DATABASE_URL ? process.env.DATABASE_URL : "postgres://" + process.env.POSTGRES_USER + ":" + process.env.POSTGRES_PASSWORD + "@localhost:5432/weight_loss"
	}
}
