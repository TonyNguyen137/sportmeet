import express from 'express';
import pool from '../models/db.js';
import bcrypt from 'bcrypt';
import { formParser } from '../utils/auth.js';

const router = express.Router();

// GET /register -> Zeigt das Formular an
router.get('/register', (req, res) => {
	res.render('base', {
		title: 'SportMeet Registrierung',
		template: 'page-register'
	});
});

// POST /register -> Verarbeitet die Formulardaten
router.post('/register', formParser, async (req, res) => {
	const { firstName, lastName, email, password, passwordConfirm } = req.body;

	if (!firstName || !lastName || !email || !password || !passwordConfirm) {
		return res.status(400).json({ error: 'Daten unvollständig' });
	}

	if (password !== passwordConfirm) {
		return res.status(400).send('Die Passwörter stimmen nicht überein.');
	}

	try {
		// 3. Passwort hashen
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// 4. SQL Query passend zu deiner psql-Struktur
		const queryText = `
            INSERT INTO users (first_name, last_name, email, password_hash) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, first_name, last_name;
        `;

		const values = [firstName, lastName, email, hashedPassword];

		const result = await pool.query(queryText, values);

		console.log('User erfolgreich angelegt:', result.rows[0]);

		// 5. Erfolg! Weiterleitung zum Login
		res.redirect('/?success=true');
	} catch (err) {
		// Fehlerbehandlung (z.B. E-Mail schon vergeben)
		if (err.code === '23505') {
			return res.status(400).send('Diese E-Mail-Adresse wird bereits verwendet.');
		}
		console.error('Registrierungsfehler:', err);
		res.status(500).send('Ein interner Fehler ist aufgetreten.');
	}
});

// POST /login -> Verarbeitet die Login-Daten
router.post('/login', formParser, async (req, res) => {
	const { email, password } = req.body;

	try {
		const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

		if (result.rows.length > 0) {
			const user = result.rows[0];
			const match = await bcrypt.compare(password, user.password_hash);
			console.log('mail', email);
			console.log('match', match);
			console.log('user: ', user);

			if (match) {
				req.session.userId = user.id;

				// 2. Save the session and THEN redirect
				return req.session.save((err) => {
					if (err) {
						console.error('Session save error:', err);
						return res.status(500).send('Internal Server Error');
					}
					console.log('Session saved, redirecting to /me...');
					res.redirect('/me');
				});
			}
		}
		res.status(401).send('E-Mail oder Passwort falsch.');
	} catch (err) {
		console.error('Login-Fehler:', err);
		res.status(500).send('Server Fehler');
	}
});

// POST /logout

router.post('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error('Logout Fehler:', err);
			return res.status(500).json({ message: 'Fehler beim Abmelden' });
		}

		// Den Session-Cookie im Browser löschen
		res.clearCookie('connect.sid');
		res.status(200).json({ message: 'Erfolgreich abgemeldet' });
	});
});

export default router;
