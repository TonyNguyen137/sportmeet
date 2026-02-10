import dotenv from 'dotenv';

dotenv.config();

const config = {
	env: process.env.NODE_ENV ?? 'development',
	port: Number(process.env.PORT || 3000),
	user: process.env.DB_USER ?? 'postgres',
	host: process.env.DB_HOST ?? 'localhost',
	database: process.env.DB_NAME ?? 'sportmeet_db',
	password: process.env.DB_PASSWORD,
	dbPort: Number(process.env.DB_PORT ?? 5432)
};

export default config;
