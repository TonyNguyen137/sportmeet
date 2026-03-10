import dotenv from 'dotenv';

dotenv.config();

const config = {
	env: process.env.NODE_ENV ?? 'development',
	trustProxy:
		process.env.TRUST_PROXY === 'true' ||
		process.env.TRUST_PROXY === '1' ||
		process.env.NODE_ENV === 'production',
	sessionCookieSecure:
		process.env.SESSION_COOKIE_SECURE === 'true' ||
		process.env.SESSION_COOKIE_SECURE === '1' ||
		((process.env.SESSION_COOKIE_SECURE === undefined ||
			process.env.SESSION_COOKIE_SECURE === '') &&
			process.env.NODE_ENV === 'production'),
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
	brevoApiKey: process.env.BREVO_API_KEY ?? '',
	mailFromName: process.env.MAIL_FROM_NAME ?? 'Sportmeet',
	mailFromAddress: process.env.MAIL_FROM_ADDRESS ?? '',
	appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
	eventReminderEnabled: process.env.EVENT_REMINDER_ENABLED !== 'false',
	eventReminderIntervalMinutes: Math.max(
		1,
		Number(process.env.EVENT_REMINDER_INTERVAL_MINUTES || 15)
	),
	eventReminderLeadMinutes: Math.max(
		1,
		Number(process.env.EVENT_REMINDER_LEAD_MINUTES || 1440)
	),
	eventReminderWindowMinutes: Math.max(
		1,
		Number(process.env.EVENT_REMINDER_WINDOW_MINUTES || 15)
	),
	dbConnectionString:
		process.env.DATABASE_URL ||
		`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
};

export default config;
