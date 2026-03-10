import pool from './db.js';

export const findSportById = async (sportId) => {
	const result = await pool.query('SELECT id FROM sports WHERE id = $1 LIMIT 1', [sportId]);
	return result.rows[0] || null;
};

export const isUserMemberOfGroup = async (groupId, userId) => {
	const result = await pool.query(
		`SELECT 1
		 FROM group_users
		 WHERE group_id = $1 AND user_id = $2
		 LIMIT 1`,
		[groupId, userId]
	);

	return result.rowCount > 0;
};

export const createEventWithCreator = async ({
	title,
	description,
	sportId,
	customSportName,
	startDatetime,
	locationName,
	street,
	houseNumber,
	postalCode,
	city,
	country,
	latitude,
	longitude,
	isPublic,
	groupId,
	createdBy
}) => {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		const eventResult = await client.query(
			`INSERT INTO events (
				title,
				description,
				sport_id,
				custom_sport_name,
				start_datetime,
				location_name,
				street,
				house_number,
				postal_code,
				city,
				country,
				latitude,
				longitude,
				is_public,
				group_id,
				created_by
			)
			VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
			)
			RETURNING id`,
			[
				title,
				description,
				sportId,
				customSportName,
				startDatetime,
				locationName,
				street,
				houseNumber,
				postalCode,
				city,
				country,
				latitude,
				longitude,
				isPublic,
				groupId,
				createdBy
			]
		);

		const eventId = eventResult.rows[0].id;

		await client.query(
			`INSERT INTO event_participants (event_id, user_id, status)
			 VALUES ($1, $2, 'accepted')`,
			[eventId, createdBy]
		);

		await client.query('COMMIT');
		return eventId;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const findEditableEventByIdForCreator = async (eventId, userId) => {
	const result = await pool.query(
		`SELECT
			id,
			title,
			description,
			sport_id,
			custom_sport_name,
			start_datetime,
			location_name,
			street,
			house_number,
			postal_code,
			city,
			country,
			is_public,
			group_id
		 FROM events
		 WHERE id = $1
		   AND created_by = $2
		 LIMIT 1`,
		[eventId, userId]
	);

	return result.rows[0] || null;
};

export const findEventForUser = async (eventId, userId) => {
	const result = await pool.query(
		`SELECT
			e.id,
			e.title,
			e.description,
			e.group_id,
			e.start_datetime,
			e.location_name,
			e.street,
			e.house_number,
			e.postal_code,
			e.city,
			e.country,
			e.created_by,
			COALESCE(s.name, e.custom_sport_name) AS sport_name,
			u.first_name AS admin_first_name,
			u.last_name AS admin_last_name,
			(e.created_by = $2) AS is_admin,
			(e.start_datetime < NOW()) AS is_expired,
			(ep_self.status = 'accepted') AS is_participating,
			COALESCE(ep_self.status, '') AS current_user_status,
			(
				SELECT COUNT(*)
				FROM event_participants ep_count
				WHERE ep_count.event_id = e.id AND ep_count.status = 'accepted'
			)::int AS participant_count
		 FROM events e
		 LEFT JOIN sports s ON s.id = e.sport_id
		 INNER JOIN users u ON u.id = e.created_by
		 LEFT JOIN event_participants ep_self
		 	ON ep_self.event_id = e.id AND ep_self.user_id = $2
		 WHERE e.id = $1
		   AND (
				e.is_public = TRUE
				OR EXISTS (
					SELECT 1
					FROM group_users gu
					WHERE gu.group_id = e.group_id AND gu.user_id = $2
				)
			)
		 LIMIT 1`,
		[eventId, userId]
	);

	return result.rows[0] || null;
};

export const findEventParticipants = async (eventId, userId) => {
	const result = await pool.query(
		`SELECT
			u.id,
			u.first_name,
			u.last_name,
			(u.id = $2) AS is_current_user,
			(u.id = e.created_by) AS is_admin
		 FROM event_participants ep
		 INNER JOIN users u ON u.id = ep.user_id
		 INNER JOIN events e ON e.id = ep.event_id
		 WHERE ep.event_id = $1
		   AND ep.status = 'accepted'
		 ORDER BY
		 	CASE WHEN u.id = e.created_by THEN 0 ELSE 1 END,
		 	u.first_name ASC,
		 	u.last_name ASC`,
		[eventId, userId]
	);

	return result.rows;
};

export const findEventComments = async (eventId, userId, limit = 150) => {
	const result = await pool.query(
		`SELECT
			c.id,
			c.content,
			c.created_at,
			u.first_name,
			u.last_name,
			(c.user_id = $2) AS is_current_user,
			(c.user_id = e.created_by) AS is_admin
		 FROM comments c
		 INNER JOIN users u ON u.id = c.user_id
		 INNER JOIN events e ON e.id = c.event_id
		 WHERE c.event_id = $1
		 ORDER BY c.created_at ASC
		 LIMIT $3`,
		[eventId, userId, limit]
	);

	return result.rows;
};

export const joinEventForUser = async (eventId, userId) => {
	const result = await pool.query(
		`INSERT INTO event_participants (event_id, user_id, status)
		 SELECT e.id, $2, 'accepted'
		 FROM events e
		 WHERE e.id = $1
		   AND (
				e.is_public = TRUE
				OR EXISTS (
					SELECT 1
					FROM group_users gu
					WHERE gu.group_id = e.group_id AND gu.user_id = $2
				)
			)
		 ON CONFLICT (event_id, user_id)
		 DO UPDATE SET status = 'accepted'
		 RETURNING event_id`,
		[eventId, userId]
	);

	return result.rowCount > 0;
};

export const leaveEventForUser = async (eventId, userId) => {
	const result = await pool.query(
		`DELETE FROM event_participants ep
		 USING events e
		 WHERE ep.event_id = $1
		   AND ep.user_id = $2
		   AND e.id = ep.event_id
		   AND e.created_by <> $2
		 RETURNING ep.event_id`,
		[eventId, userId]
	);

	return result.rowCount > 0;
};

export const addCommentToEvent = async (eventId, userId, content) => {
	const result = await pool.query(
		`INSERT INTO comments (event_id, user_id, content)
		 SELECT e.id, $2, $3
		 FROM events e
		 WHERE e.id = $1
		   AND (
				e.is_public = TRUE
				OR EXISTS (
					SELECT 1
					FROM group_users gu
					WHERE gu.group_id = e.group_id AND gu.user_id = $2
				)
			)
		 RETURNING id`,
		[eventId, userId, content]
	);

	return result.rowCount > 0;
};

export const updateEventByIdForCreator = async (
	eventId,
	userId,
	{
		title,
		description,
		sportId,
		customSportName,
		startDatetime,
		locationName,
		street,
		houseNumber,
		postalCode,
		city,
		country,
		latitude,
		longitude,
		isPublic,
		groupId
	}
) => {
	const result = await pool.query(
		`UPDATE events
		 SET title = $3,
		 	 description = $4,
		 	 sport_id = $5,
		 	 custom_sport_name = $6,
		 	 start_datetime = $7,
		 	 location_name = $8,
		 	 street = $9,
		 	 house_number = $10,
		 	 postal_code = $11,
		 	 city = $12,
		 	 country = $13,
		 	 latitude = $14,
		 	 longitude = $15,
		 	 is_public = $16,
		 	 group_id = $17
		 WHERE id = $1
		   AND created_by = $2
		 RETURNING id`,
		[
			eventId,
			userId,
			title,
			description,
			sportId,
			customSportName,
			startDatetime,
			locationName,
			street,
			houseNumber,
			postalCode,
			city,
			country,
			latitude,
			longitude,
			isPublic,
			groupId
		]
	);

	return result.rowCount > 0;
};

export const findNearbyPublicEvents = async ({ userId, latitude, longitude, radiusKm = 10, limit = 60 }) => {
	const result = await pool.query(
		`WITH public_events AS (
			SELECT
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
				(e.created_by = $1) AS is_created_by_current_user,
				COALESCE(ep_stats.accepted_count, 0)::int AS accepted_count,
				(6371 * acos(least(1, greatest(-1,
					cos(radians($2)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians($3))
					+ sin(radians($2)) * sin(radians(e.latitude))
				)))) AS distance_km
			FROM events e
			LEFT JOIN sports s ON s.id = e.sport_id
			INNER JOIN users u ON u.id = e.created_by
			LEFT JOIN (
				SELECT
					event_id,
					COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count
				FROM event_participants
				GROUP BY event_id
			) ep_stats ON ep_stats.event_id = e.id
			WHERE e.is_public = TRUE
			  AND e.created_by <> $1
			  AND NOT EXISTS (
				SELECT 1
				FROM event_participants ep_self
				WHERE ep_self.event_id = e.id
				  AND ep_self.user_id = $1
				  AND ep_self.status = 'accepted'
			  )
			  AND e.start_datetime >= NOW()
			  AND e.latitude IS NOT NULL
			  AND e.longitude IS NOT NULL
		)
		SELECT
			id,
			title,
			start_datetime,
			location_name,
			street,
			house_number,
			postal_code,
			city,
			sport_name,
			creator_name,
			is_created_by_current_user,
			accepted_count,
			ROUND(distance_km::numeric, 1) AS distance_km
		FROM public_events
		WHERE distance_km <= $4
		ORDER BY distance_km ASC, start_datetime ASC
		LIMIT $5`,
		[userId, latitude, longitude, radiusKm, limit]
	);

	return result.rows;
};

export const removeEventCommentByAdmin = async (eventId, commentId, userId) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const eventResult = await client.query(
			`SELECT created_by, start_datetime
			 FROM events
			 WHERE id = $1
			 LIMIT 1`,
			[eventId]
		);

		if (eventResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'EVENT_NOT_FOUND' };
		}

		const isExpired = new Date(eventResult.rows[0].start_datetime) < new Date();
		if (isExpired) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'EVENT_EXPIRED' };
		}

		const adminId = Number(eventResult.rows[0].created_by);
		const normalizedUserId = Number(userId);
		if (!Number.isInteger(normalizedUserId) || adminId !== normalizedUserId) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'NOT_ALLOWED' };
		}

		const deleteResult = await client.query(
			`DELETE FROM comments
			 WHERE event_id = $1
			   AND id = $2
			 RETURNING id`,
			[eventId, commentId]
		);

		if (deleteResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'COMMENT_NOT_FOUND' };
		}

		await client.query('COMMIT');
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const removeEventParticipantByAdmin = async (eventId, participantId, userId) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const eventResult = await client.query(
			`SELECT created_by, start_datetime
			 FROM events
			 WHERE id = $1
			 LIMIT 1`,
			[eventId]
		);

		if (eventResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'EVENT_NOT_FOUND' };
		}

		const isExpired = new Date(eventResult.rows[0].start_datetime) < new Date();
		if (isExpired) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'EVENT_EXPIRED' };
		}

		const adminId = Number(eventResult.rows[0].created_by);
		const normalizedUserId = Number(userId);
		if (!Number.isInteger(normalizedUserId) || adminId !== normalizedUserId) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'NOT_ALLOWED' };
		}

		if (participantId === adminId) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'CANNOT_REMOVE_ADMIN' };
		}

		const removeResult = await client.query(
			`DELETE FROM event_participants
			 WHERE event_id = $1
			   AND user_id = $2
			 RETURNING event_id`,
			[eventId, participantId]
		);

		if (removeResult.rowCount === 0) {
			await client.query('ROLLBACK');
			return { ok: false, code: 'PARTICIPANT_NOT_FOUND' };
		}

		await client.query('COMMIT');
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const deleteEventByIdForCreator = async (eventId, userId) => {
	const result = await pool.query(
		`DELETE FROM events
		 WHERE id = $1
		   AND created_by = $2
		 RETURNING id`,
		[eventId, userId]
	);

	return result.rowCount > 0;
};

export const findReminderRecipientsDue = async (leadMinutes = 10, windowMinutes = 15, limit = 500) => {
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
			u.id AS user_id,
			u.email,
			u.first_name,
			u.last_name,
			COALESCE(participants.participant_names, '') AS participant_names
		 FROM events e
		 INNER JOIN event_participants ep
		 	ON ep.event_id = e.id
		 INNER JOIN users u
		 	ON u.id = ep.user_id
		 LEFT JOIN LATERAL (
			SELECT string_agg(
				trim(participant_user.first_name || ' ' || participant_user.last_name),
				', '
				ORDER BY participant_user.first_name ASC, participant_user.last_name ASC
			) AS participant_names
			FROM event_participants participant_ep
			INNER JOIN users participant_user
				ON participant_user.id = participant_ep.user_id
			WHERE participant_ep.event_id = e.id
			  AND participant_ep.status = 'accepted'
		 ) participants ON TRUE
		 LEFT JOIN event_reminder_deliveries erd
		 	ON erd.event_id = e.id
			AND erd.user_id = u.id
		 WHERE e.start_datetime >= (NOW() + make_interval(mins => $1))
		   AND e.start_datetime < (NOW() + make_interval(mins => $1 + $2))
		   AND ep.status = 'accepted'
		   AND erd.event_id IS NULL
		 ORDER BY e.start_datetime ASC, e.id ASC, u.id ASC
		 LIMIT $3`,
		[leadMinutes, windowMinutes, limit]
	);

	return result.rows;
};

export const markReminderDeliverySent = async (eventId, userId) => {
	const result = await pool.query(
		`INSERT INTO event_reminder_deliveries (event_id, user_id, sent_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (event_id, user_id) DO NOTHING
		 RETURNING event_id`,
		[eventId, userId]
	);

	return result.rowCount > 0;
};
