// External Packages
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

// Node.js Built-in Modules
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

// Local Project Files
import pool from './models/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import { checkAuth } from './utils/auth.js';
import { loadUserData } from './utils/load-user-data.js'; // Pfad und Endung wichtig!
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
app.set('views', path.join(projectRoot, 'server', 'views'));

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

app.use(loadUserData);

// ==========================================
// ROUTES
// ==========================================

// --- Home Route ---
app.get('/', (req, res) => {
	if (req.session && req.session.userId) {
		return res.redirect('/me');
	}
	res.render('base', {
		title: 'SportMeet Startseite',
		template: 'index'
	});
});

// --- Auth Routes  ---
app.use('/auth', authRoutes);

// --- User Routes  ---

app.use('/user', userRoutes); // Profilverwaltung / Account löschen

// -------------------------------

app.get('/forgot-password', (req, res) => {
	res.render('base', {
		title: 'SportMeet Passwort vergessen',
		template: 'page-forgot-password'
	});
});

app.get('/me', checkAuth, async (req, res) => {
	try {
		// 2. Die Daten an das Template übergeben
		res.render('base', {
			title: 'SportMeet - Mein User Dashboard',
			template: 'page-single'
		});
	} catch (err) {
		console.error('Fehler beim Laden des Dashboards:', err);
		res.status(500).send('Server Fehler');
	}
});

export default app;
