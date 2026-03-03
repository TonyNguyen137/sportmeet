import pool from './db.js';

export const findGroupForUser = async (groupId, userId) => {
	const result = await pool.query(
		`SELECT
				g.id,
				g.name,
				g.description,
				(
					SELECT COUNT(*)
					FROM group_users gu_count
					WHERE gu_count.group_id = g.id
				)::int AS member_count,
				(g.created_by = $2) AS is_owner,
				u.first_name AS admin_first_name,
				u.last_name AS admin_last_name
		 FROM groups g
		 INNER JOIN group_users gu ON gu.group_id = g.id
		 INNER JOIN users u ON u.id = g.created_by
		 WHERE g.id = $1 AND gu.user_id = $2`,
		[groupId, userId]
	);
	return result.rows[0] || null;
};

export const findGroupMembers = async (groupId, userId) => {
	const result = await pool.query(
		`SELECT
				u.id,
				u.first_name,
				u.last_name,
				gu.role,
				(u.id = $2) AS is_current_user
		 FROM group_users gu
		 INNER JOIN users u ON u.id = gu.user_id
		 WHERE gu.group_id = $1
		 ORDER BY
			 CASE WHEN gu.role = 'admin' THEN 0 ELSE 1 END,
			 u.first_name ASC,
			 u.last_name ASC`,
		[groupId, userId]
	);

	return result.rows;
};

export const createGroupWithAdmin = async (
	groupName,
	description,
	userId,
	createInviteCode,
	maxAttempts = 5
) => {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		let groupId = null;
		let attempts = 0;

		while (!groupId && attempts < maxAttempts) {
			attempts += 1;
			const inviteCode = createInviteCode();

			try {
				const result = await client.query(
					`INSERT INTO groups (name, description, invite_code, created_by)
					 VALUES ($1, $2, $3, $4)
					 RETURNING id`,
					[groupName, description, inviteCode, userId]
				);
				groupId = result.rows[0].id;
			} catch (err) {
				if (err.code !== '23505') throw err;
			}
		}

		if (!groupId) {
			throw new Error('Invite-Code konnte nicht erzeugt werden.');
		}

		await client.query(
			`INSERT INTO group_users (group_id, user_id, role)
			 VALUES ($1, $2, 'admin')`,
			[groupId, userId]
		);

		await client.query('COMMIT');
		return groupId;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const findGroupIdByInviteCode = async (inviteCode) => {
	const result = await pool.query('SELECT id FROM groups WHERE invite_code = $1', [
		inviteCode
	]);
	return result.rows[0]?.id || null;
};

export const joinGroupById = async (groupId, userId) => {
	const result = await pool.query(
		`INSERT INTO group_users (group_id, user_id, role)
		 VALUES ($1, $2, 'member')
		 ON CONFLICT (group_id, user_id) DO NOTHING
		 RETURNING group_id`,
		[groupId, userId]
	);
	return result.rowCount;
};

export const deleteGroupByIdForOwner = async (groupId, userId) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const groupResult = await client.query(
			`SELECT id
			 FROM groups
			 WHERE id = $1 AND created_by = $2
			 LIMIT 1`,
			[groupId, userId]
		);

		if (groupResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return false;
		}

		// Delete group-bound events first to avoid visibility check conflicts
		// when group_id would otherwise be set to NULL on group deletion.
		await client.query('DELETE FROM events WHERE group_id = $1', [groupId]);

		await client.query('DELETE FROM groups WHERE id = $1', [groupId]);

		await client.query('COMMIT');
		return true;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const removeGroupMemberByOwner = async (groupId, memberId, userId) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const ownerResult = await client.query(
			`SELECT id
			 FROM groups
			 WHERE id = $1 AND created_by = $2
			 LIMIT 1`,
			[groupId, userId]
		);

		if (ownerResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'NOT_ALLOWED' };
		}

		const memberResult = await client.query(
			`SELECT role
			 FROM group_users
			 WHERE group_id = $1 AND user_id = $2
			 LIMIT 1`,
			[groupId, memberId]
		);

		if (memberResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'MEMBER_NOT_FOUND' };
		}

		if (memberResult.rows[0].role === 'admin') {
			await client.query('ROLLBACK');
			return { ok: false, code: 'CANNOT_REMOVE_ADMIN' };
		}

		await client.query(
			`DELETE FROM group_users
			 WHERE group_id = $1 AND user_id = $2`,
			[groupId, memberId]
		);

		await client.query('COMMIT');
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const regenerateInviteCodeByAdmin = async (
	groupId,
	userId,
	createInviteCode,
	maxAttempts = 5
) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const adminResult = await client.query(
			`SELECT 1
			 FROM group_users
			 WHERE group_id = $1 AND user_id = $2 AND role = 'admin'
			 LIMIT 1`,
			[groupId, userId]
		);

		if (adminResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return false;
		}

		let updatedCode = null;
		let attempts = 0;

		while (!updatedCode && attempts < maxAttempts) {
			attempts += 1;
			const nextCode = createInviteCode();

			try {
				const result = await client.query(
					`UPDATE groups
					 SET invite_code = $1
					 WHERE id = $2
					 RETURNING invite_code`,
					[nextCode, groupId]
				);

				updatedCode = result.rows[0]?.invite_code || null;
			} catch (err) {
				if (err.code !== '23505') {
					throw err;
				}
			}
		}

		if (!updatedCode) {
			throw new Error('Invite-Code konnte nicht neu erzeugt werden.');
		}

		await client.query('COMMIT');
		return true;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const findUpcomingEventsForGroup = async (groupId, userId, limit = 12) => {
	const result = await pool.query(
		`SELECT
				e.id,
				e.title,
				e.start_datetime,
				e.location_name,
				e.street,
				e.house_number,
				e.postal_code,
				e.city,
				COALESCE(s.name, e.custom_sport_name) AS sport_name,
				u.first_name || ' ' || u.last_name AS creator_name,
				(e.created_by = $2) AS is_created_by_current_user,
				ep_self.status AS current_user_status,
				COALESCE(ep_stats.accepted_count, 0)::int AS accepted_count
		 FROM events e
		 LEFT JOIN sports s ON s.id = e.sport_id
		 INNER JOIN users u ON u.id = e.created_by
		 LEFT JOIN event_participants ep_self
		 	ON ep_self.event_id = e.id AND ep_self.user_id = $2
		 LEFT JOIN (
			 SELECT
				event_id,
				COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count
			 FROM event_participants
			 GROUP BY event_id
		 ) ep_stats ON ep_stats.event_id = e.id
		 WHERE e.group_id = $1
		   AND e.start_datetime >= NOW()
		 ORDER BY e.start_datetime ASC
		 LIMIT $3`,
		[groupId, userId, limit]
	);

	return result.rows;
};
