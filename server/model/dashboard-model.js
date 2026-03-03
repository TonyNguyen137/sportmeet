import pool from './db.js';

export const findAllSports = async () => {
	const result = await pool.query('SELECT id, name FROM sports ORDER BY name ASC');
	return result.rows;
};

export const findMyEventsForUser = async (userId, limit = 100) => {
	const result = await pool.query(
		`SELECT
			e.id,
			e.title,
			e.is_public,
			e.start_datetime,
			e.location_name,
			e.street,
			e.house_number,
			e.postal_code,
			e.city,
			g.name AS group_name,
			COALESCE(s.name, e.custom_sport_name) AS sport_name,
			u.first_name || ' ' || u.last_name AS creator_name,
			(e.created_by = $1) AS is_created_by_current_user,
			COALESCE(ep_stats.accepted_count, 0)::int AS accepted_count
		 FROM event_participants ep_self
		 INNER JOIN events e ON e.id = ep_self.event_id
		 LEFT JOIN groups g ON g.id = e.group_id
		 LEFT JOIN sports s ON s.id = e.sport_id
		 INNER JOIN users u ON u.id = e.created_by
		 LEFT JOIN (
			 SELECT
				event_id,
				COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count
			 FROM event_participants
			 GROUP BY event_id
		 ) ep_stats ON ep_stats.event_id = e.id
		 WHERE ep_self.user_id = $1
		   AND ep_self.status = 'accepted'
		 ORDER BY e.start_datetime ASC
		 LIMIT $2`,
		[userId, limit]
	);

	return result.rows;
};
