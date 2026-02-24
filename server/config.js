import dotenv from 'dotenv';

dotenv.config();

const config = {
	env: process.env.NODE_ENV ?? 'development',
	port: Number(process.env.PORT || 3000),
	user: process.env.DB_USER ?? 'postgres',
	host: process.env.DB_HOST ?? 'localhost',
	database: process.env.DB_NAME ?? 'sportmeet_db',
	password: process.env.DB_PASSWORD,
	dbPort: Number(process.env.DB_PORT ?? 5433),
	sessionSecret: process.env.SESSION_SECRET,
	geocodingProvider: process.env.GEOCODING_PROVIDER ?? 'nominatim',
	geocodingUserAgent:
		process.env.GEOCODING_USER_AGENT ?? 'sportmeet/0.1 (dev@sportmeet.local)',
	dbConnectionString:
		process.env.DATABASE_URL ||
		`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
};

export default config;
