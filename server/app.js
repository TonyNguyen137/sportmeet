import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import express from 'express';
import authRoutes from './routes/auth.js';
const app = express();

// Determine the directory name of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Set up the view engine and views directory for rendering dynamic content
// Set EJS as the view engine
app.set('views', path.join(projectRoot, 'server', 'views'));
app.set('view engine', 'ejs');
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================

// --- Home Route ---
app.get('/', (req, res) => {
	res.render('base', {
		title: 'SportMeet Startseite',
		template: 'index'
	});
});

// --- Auth Routes (/register, /login etc.) ---
app.use('/auth', authRoutes);

// -------------------------------

app.get('/forgot-password', (req, res) => {
	res.render('base', {
		title: 'SportMeet Passwort vergessen',
		template: 'page-forgot-password'
	});
});

app.get('/me', (req, res) => {
	res.render('base', {
		title: 'SportMeet - Mein User Dashboard',
		template: 'page-single'
	});
});

export default app;
