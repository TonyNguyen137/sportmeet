import pool from './db.js';

export const deleteUserById = async (userId) => {
	await pool.query('DELETE FROM users WHERE id = $1', [userId]);
};

export const findUserBasicById = async (userId) => {
	const result = await pool.query(
		'SELECT email, first_name, last_name FROM users WHERE id = $1',
		[userId]
	);
	return result.rows[0] || null;
};

export const findUserGroupsByUserId = async (userId) => {
	const result = await pool.query(
		`SELECT
			g.id,
			g.name,
			g.invite_code,
			gu.role,
			COUNT(gu_all.user_id)::int AS member_count
		FROM group_users gu
		INNER JOIN groups g ON g.id = gu.group_id
		LEFT JOIN group_users gu_all ON gu_all.group_id = g.id
		WHERE gu.user_id = $1
		GROUP BY g.id, g.name, g.invite_code, gu.role, g.created_at
		ORDER BY g.created_at DESC`,
		[userId]
	);
	return result.rows;
};
