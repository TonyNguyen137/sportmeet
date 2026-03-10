import pool from './db.js';

export const deleteUserById = async (userId) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const ownedGroupsResult = await client.query(
			'SELECT id FROM groups WHERE created_by = $1',
			[userId]
		);
		const ownedGroupIds = ownedGroupsResult.rows.map((row) => row.id);

		if (ownedGroupIds.length > 0) {
			await client.query('DELETE FROM events WHERE group_id = ANY($1::bigint[])', [
				ownedGroupIds
			]);
			await client.query('DELETE FROM groups WHERE id = ANY($1::bigint[])', [ownedGroupIds]);
		}

		await client.query('DELETE FROM events WHERE created_by = $1', [userId]);
		await client.query('DELETE FROM users WHERE id = $1', [userId]);
		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

export const findUserBasicById = async (userId) => {
	const result = await pool.query(
		'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
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

export const updateUserProfileById = async (userId, firstName, lastName) => {
	const result = await pool.query(
		`UPDATE users
		 SET first_name = $2,
		 	 last_name = $3
		 WHERE id = $1
		 RETURNING id, email, first_name, last_name`,
		[userId, firstName, lastName]
	);

	return result.rows[0] || null;
};
