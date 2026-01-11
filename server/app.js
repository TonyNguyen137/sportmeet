import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import express from 'express';

const app = express();

// Determine the directory name of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define the project root directory
const projectRoot = path.join(__dirname, '..');

// Set up the view engine and views directory for rendering dynamic content
// Set EJS as the view engine
app.set('views', path.join(projectRoot, 'views'));
app.set('view engine', 'ejs');

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
		'index.js': '/assets/index.js',
		'index.css': '/assets/styles.css'
	};
	console.warn('[assets] manifest.json not found:', manifestPath);
}

// -------------------------------

app.get('/', (req, res) => {
	res.render('base', {
		title: 'Sport Plattform Startseite',
		template: 'index'
	});
});

export default app;
