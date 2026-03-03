// External Packages
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

// Node.js Built-in Modules
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

// Local Project Files
import pool from './model/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import eventsRoutes from './routes/events.js';
import groupsRoutes from './routes/groups.js';
import { findAllSports, findMyEventsForUser } from './model/dashboard-model.js';
import { checkAuth } from './utils/auth.js';
import { consumeFlash, FLASH_KEYS } from './utils/flash.js';
import { loadUserData } from './utils/load-user-data.js'; // Pfad und Endung wichtig!
import { attachCsrfToken, requireCsrfToken } from './utils/csrf.js';
import config from './config.js';

// Setup __dirname for ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PostgresStore = connectPgSimple(session);

// Define the project root directory
const projectRoot = path.join(__dirname, '..');

// Serve static files (like CSS, images, and client-side JavaScript) from the 'public' directory
const PUBLIC_DIR_SLUG = '/public';
const PUBLIC_DIR_PATH = path.join(projectRoot, 'public');

app.use(PUBLIC_DIR_SLUG, express.static(PUBLIC_DIR_PATH));

// ---- Asset manifest (maps source filenames -> hashed build filenames) ----

const manifestPath = path.join(projectRoot, 'public', 'manifest.json');

let manifest = {};

if (fs.existsSync(manifestPath)) {
	manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	app.locals.assets = manifest;
	app.locals.publicPrefix = PUBLIC_DIR_SLUG;
} else {
	app.locals.assets = {
		'index.js': 'index.js',
		'index.css': 'styles.css',
		'sprite.svg': 'sprite.svg'
	};
	console.warn('[assets] manifest.json not found:', manifestPath);
}

// ==========================================
// Middleware
// ==========================================

// -- Set up the view engine and views directory for rendering dynamic content --
app.set('views', path.join(projectRoot, 'server', 'view'));

// -- Set EJS as the view engine --
app.set('view engine', 'ejs');

// -- Set Session --
// Session configuration
app.use(
	session({
		// Store session data in PostgreSQL to persist through server restarts
		store: new PostgresStore({
			pool: pool,
			tableName: 'session'
		}),
		name: 'sportmeet_sid',
		secret: config.sessionSecret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24,
			httpOnly: true,
			secure: config.env === 'production'
		}
	})
);

app.use(express.urlencoded({ extended: true }));
app.use(loadUserData);
app.use(attachCsrfToken);
app.use(requireCsrfToken);
app.use((req, res, next) => {
	res.locals.toast = consumeFlash(req, FLASH_KEYS.toast, null);
	next();
});

// ==========================================
// ROUTES
// ==========================================

// --- Home Route ---
app.get('/', (req, res) => {
	if (req.session && req.session.userId) {
		return res.redirect('/me');
	}

	const loginFeedback = consumeFlash(req, FLASH_KEYS.loginFeedback, {});
	const authSuccess = consumeFlash(req, FLASH_KEYS.authSuccess, {});
	const hasLoginErrors =
		Array.isArray(loginFeedback.errors) && loginFeedback.errors.length > 0;
	const loginValues = hasLoginErrors
		? loginFeedback.values || {}
		: authSuccess.values || {};

	res.render('base', {
		title: 'SportMeet Startseite',
		template: 'index',
		loginErrorTitle:
			loginFeedback.errorTitle ||
			'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:',
		loginErrors: loginFeedback.errors || [],
		loginValues,
		loginSuccessMessage: authSuccess.message || ''
	});
});

// --- Auth Routes  ---
app.use('/', authRoutes);

// --- User Routes  ---
app.get('/me', checkAuth, async (req, res) => {
	try {
		const sports = await findAllSports();
		const userId = req.session?.userId;
		const myEvents = userId ? await findMyEventsForUser(userId, 100) : [];
		const eventFormFeedback = consumeFlash(req, FLASH_KEYS.eventFormFeedback, {});

		return res.render('base', {
			title: 'SportMeet - Meine Termine',
			template: 'page-me-events',
			sports,
			myEvents,
			activeDashboardPage: 'events',
			eventFormFeedback
		});
	} catch (err) {
		console.error('Fehler beim Laden der Terminseite:', err);
		return res.status(500).send('Server Fehler');
	}
});

app.get('/me/events', checkAuth, (req, res) => {
	return res.redirect(301, '/me');
});

app.get('/me/groups', checkAuth, async (req, res) => {
	try {
		const sports = await findAllSports();

		return res.render('base', {
			title: 'SportMeet - Meine Gruppen',
			template: 'page-me-groups',
			sports,
			activeDashboardPage: 'groups'
		});
	} catch (err) {
		console.error('Fehler beim Laden der Gruppenseite:', err);
		return res.status(500).send('Server Fehler');
	}
});

app.use('/user', userRoutes); // Profilverwaltung / Account löschen

// --- Events Routes  ---

app.use('/events', eventsRoutes); // Termine erstellen

// --- Groups Routes  ---

app.use('/groups', groupsRoutes); // Gruppen erstellen

if (config.env === 'development') {
	app.get('/dev/error', (req, res, next) => {
		next(new Error('Testfehler: manuell ausgelöst'));
	});
}

// --- 404 ---
app.use((req, res) => {
	return res.status(404).render('base', {
		title: '404 - Seite nicht gefunden',
		template: 'page-404'
	});
});

// --- Error Handler ---
app.use((err, req, res, next) => {
	console.error('[error-handler]', err);

	if (res.headersSent) {
		return next(err);
	}

	const statusCode =
		Number.isInteger(err?.statusCode) && err.statusCode >= 400 ? err.statusCode : 500;

	const message =
		statusCode === 500
			? 'Es ist ein interner Serverfehler aufgetreten.'
			: err?.message || 'Ein Fehler ist aufgetreten.';

	if (req.accepts('html')) {
		return res.status(statusCode).render('base', {
			title: `${statusCode} - Fehler`,
			template: 'page-error',
			errorStatusCode: statusCode,
			errorMessage: message
		});
	}

	if (req.accepts('json')) {
		return res.status(statusCode).json({ error: message });
	}

	return res.status(statusCode).send(message);
});

export default app;
