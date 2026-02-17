import express from 'express';
import pool from '../models/db.js';

const router = express.Router();

router.post('/delete-account', async (req, res) => {
	// 1. Hol die ID aus der Session
	const userId = req.session.userId;

	// 2. Sicherheits-Check: Ist der User überhaupt eingeloggt?
	if (!userId) {
		return res.status(401).json({ error: 'Nicht autorisiert' });
	}

	try {
		// 3. Löschen in der Datenbank
		// WICHTIG: Hier greift dein "Migration-Thema":
		// Wenn Gruppen an diesem User hängen, muss die DB auf "CASCADE" stehen!
		await pool.query('DELETE FROM users WHERE id = $1', [userId]);

		// 4. Session zerstören & Cookie löschen
		req.session.destroy((err) => {
			if (err) {
				console.error('Session destroy error:', err);
				return res.sendStatus(500);
			}
			res.clearCookie('connect.sid'); // Name deines Session-Cookies
			res.sendStatus(200); // Erfolgreich
		});
	} catch (err) {
		console.error('Database error during deletion:', err);
		res.status(500).json({ error: 'Datenbankfehler' });
	}
});

export default router;
