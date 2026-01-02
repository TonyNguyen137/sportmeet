import path from 'node:path';
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
app.use('/public', express.static(path.join(projectRoot, 'public')));

app.get('/', (req, res) => {
	res.render('partials/layout', {
		title: 'Sport Plattform Startseite',
		template: 'index'
	});
});

export default app;
