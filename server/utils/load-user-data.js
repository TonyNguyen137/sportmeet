// utils.js
import pool from '../models/db.js';

export const loadUserData = async (req, res, next) => {
	if (req.session && req.session.userId) {
		try {
			const result = await pool.query(
				'SELECT email, first_name, last_name FROM users WHERE id = $1',
				[req.session.userId]
			);
			const groupsResult = await pool.query(
				`SELECT
					g.id,
					g.name,
					g.invite_code,
					g.color,
					gu.role,
					COUNT(gu_all.user_id)::int AS member_count
				FROM group_users gu
				INNER JOIN groups g ON g.id = gu.group_id
				LEFT JOIN group_users gu_all ON gu_all.group_id = g.id
				WHERE gu.user_id = $1
				GROUP BY g.id, g.name, g.invite_code, g.color, gu.role, g.created_at
				ORDER BY g.created_at DESC`,
				[req.session.userId]
			);
			const host = req.get('host');
			const origin = host ? `${req.protocol}://${host}` : '';
			const userGroups = groupsResult.rows.map((group) => ({
				...group,
				invite_link: `${origin}/groups/join?invite=${encodeURIComponent(group.invite_code)}`
			}));

			// Global verfügbar in allen EJS Templates
			res.locals.currentUser = result.rows[0] || null;
			res.locals.userGroups = userGroups;
		} catch (err) {
			console.error('Fehler beim Laden der User-Daten:', err);
			res.locals.currentUser = null;
			res.locals.userGroups = [];
		}
	} else {
		res.locals.currentUser = null;
		res.locals.userGroups = [];
	}
	next();
};
