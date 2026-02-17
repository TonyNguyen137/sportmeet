// utils.js
import pool from '../models/db.js';

export const loadUserData = async (req, res, next) => {
	if (req.session && req.session.userId) {
		try {
			const result = await pool.query(
				'SELECT email, first_name, last_name FROM users WHERE id = $1',
				[req.session.userId]
			);

			// Global verfügbar in allen EJS Templates
			res.locals.currentUser = result.rows[0] || null;
		} catch (err) {
			console.error('Fehler beim Laden der User-Daten:', err);
			res.locals.currentUser = null;
		}
	} else {
		res.locals.currentUser = null;
	}
	next();
};
