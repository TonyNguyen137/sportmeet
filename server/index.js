import app from './app.js';
import config from './config.js';
import pool from './model/db.js';
import { runEventReminderJob } from './service/event-reminder-service.js';

const port = config.port;

const formatDbBootstrapError = (error) => {
	const details = [];

	if (error?.code) {
		details.push(`code=${error.code}`);
	}

	if (error?.message) {
		details.push(error.message);
	}

	return details.join(' | ');
};

const bootstrap = async () => {
	try {
		await pool.query('SELECT 1');
	} catch (error) {
		console.error(`[bootstrap] Database connection failed. Server stopped. ${formatDbBootstrapError(error)}`);
		process.exit(1);
	}

	app.listen(port, () => {
		if (config.env === 'development') {
			console.log(`App listening at http://localhost:${port}`);
		} else {
			console.log(`App listening at ${port}`);
		}

		startEventReminderScheduler();
	});
};

const startEventReminderScheduler = () => {
	if (!config.eventReminderEnabled) {
		console.info('[event-reminder] scheduler disabled by config');
		return;
	}

	const intervalMs = config.eventReminderIntervalMinutes * 60 * 1000;
	let isRunning = false;

	const runSafely = async () => {
		if (isRunning) {
			console.warn('[event-reminder] previous run still active, skipping tick');
			return;
		}

		isRunning = true;
		try {
			await runEventReminderJob();
		} catch (error) {
			console.error('[event-reminder] scheduler tick failed', {
				error: error?.message || error
			});
		} finally {
			isRunning = false;
		}
	};

	console.info('[event-reminder] scheduler started', {
		intervalMinutes: config.eventReminderIntervalMinutes
	});

	void runSafely();
	setInterval(runSafely, intervalMs);
};

bootstrap();
