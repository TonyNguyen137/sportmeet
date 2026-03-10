import pool from '../server/model/db.js';

const START_EVENTS = [
	{
		title: 'Feierabendlauf',
		description: 'Lockere 6 km Runde fuer alle Levels. Wir laufen entspannt und trinken danach noch etwas.',
		sportName: 'Joggen/Laufen',
		startDatetime: '2026-04-23T18:30:00+02:00',
		locationName: 'Arcaden',
		street: 'Westerwaldstraße',
		houseNumber: '92',
		postalCode: '51105',
		city: 'Köln',
		country: 'DE',
		latitude: 50.928242,
		longitude: 6.99573,
		createdByEmail: 'test@user1.de'
	},
	{
		title: 'After-Work Basketball',
		description: 'Offenes Shooting und lockeres 3-gegen-3. Einfach vorbeikommen, auch wenn du niemanden kennst.',
		sportName: 'Basketball',
		startDatetime: '2026-04-25T19:00:00+02:00',
		locationName: 'Sportplatz Kalk',
		street: 'Kalker Hauptstraße',
		houseNumber: '112',
		postalCode: '51103',
		city: 'Köln',
		country: 'DE',
		latitude: 50.937596,
		longitude: 7.001395,
		createdByEmail: 'test@user2.de'
	},
	{
		title: 'Mittags-Yoga',
		description:
			'Entspannte Yoga-Session fuer Einsteiger und Fortgeschrittene. Bring einfach eine Matte und etwas Wasser mit.',
		sportName: 'Yoga',
		startDatetime: '2026-04-28T12:00:00+02:00',
		locationName: 'Studio Kalk',
		street: 'Kalker Hauptstraße',
		houseNumber: '55',
		postalCode: '51103',
		city: 'Köln',
		country: 'DE',
		latitude: 50.937649,
		longitude: 6.99805,
		createdByEmail: 'test@user3.de'
	},
	{
		title: 'Fussballabend',
		description: 'Interne Runde fuer die Fussbal Warriors. Lockeres Kicken, ein paar Uebungen und dann Match.',
		sportName: 'Fussball',
		startDatetime: '2026-04-29T18:45:00+02:00',
		locationName: 'Aldi Süd',
		street: 'Kalker Hauptstraße',
		houseNumber: '145',
		postalCode: '51103',
		city: 'Köln',
		country: 'DE',
		latitude: 50.937972,
		longitude: 7.002509,
		createdByEmail: 'tony.n@gso.schule.koeln',
		isPublic: false,
		groupName: 'Fußbal Warriors'
	}
];

const findRequiredIds = async (client, { createdByEmail, sportName, groupName = null }) => {
	const userResult = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [createdByEmail]);
	const sportResult = await client.query('SELECT id FROM sports WHERE name = $1 LIMIT 1', [sportName]);
	const groupResult = groupName
		? await client.query('SELECT id FROM groups WHERE name = $1 LIMIT 1', [groupName])
		: { rows: [] };

	return {
		userId: userResult.rows[0]?.id ?? null,
		sportId: sportResult.rows[0]?.id ?? null,
		groupId: groupResult.rows[0]?.id ?? null
	};
};

const insertEventIfMissing = async (client, event, { userId, sportId, groupId }) => {
	const isPublic = event.isPublic !== false;
	const insertResult = await client.query(
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
		SELECT
			$1::varchar(140),
			$2::text,
			$3::bigint,
			NULL,
			$4::timestamptz,
			$5::varchar(140),
			$6::varchar(140),
			$7::varchar(20),
			$8::varchar(12),
			$9::varchar(80),
			$10::varchar(2),
			$11::double precision,
			$12::double precision,
			$13::boolean,
			$14::bigint,
			$15::bigint
		WHERE NOT EXISTS (
			SELECT 1
			FROM events
			WHERE title = $1::varchar(140)
			  AND start_datetime = $4::timestamptz
			  AND created_by = $15::bigint
		)
		RETURNING id`,
		[
			event.title,
			event.description,
			sportId,
			event.startDatetime,
			event.locationName,
			event.street,
			event.houseNumber,
			event.postalCode,
			event.city,
			event.country,
			event.latitude,
			event.longitude,
			isPublic,
			isPublic ? null : groupId,
			userId
		]
	);

	if (insertResult.rows[0]?.id) {
		return insertResult.rows[0].id;
	}

	const existingResult = await client.query(
		`SELECT id
		 FROM events
		 WHERE title = $1::varchar(140)
		   AND start_datetime = $2::timestamptz
		   AND created_by = $3::bigint
		 LIMIT 1`,
		[event.title, event.startDatetime, userId]
	);

	return existingResult.rows[0]?.id ?? null;
};

const seedStartEvents = async () => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		for (const event of START_EVENTS) {
			const { userId, sportId, groupId } = await findRequiredIds(client, event);

			if (!userId) {
				throw new Error(`Seed-User nicht gefunden: ${event.createdByEmail}`);
			}

			if (!sportId) {
				throw new Error(`Sportart nicht gefunden: ${event.sportName}`);
			}

			if (event.isPublic === false && !groupId) {
				throw new Error(`Gruppe nicht gefunden: ${event.groupName}`);
			}

			const eventId = await insertEventIfMissing(client, event, {
				userId,
				sportId,
				groupId
			});

			if (!eventId) {
				throw new Error(`Event konnte nicht angelegt werden: ${event.title}`);
			}

			await client.query(
				`INSERT INTO event_participants (event_id, user_id, status)
				 VALUES ($1, $2, 'accepted')
				 ON CONFLICT (event_id, user_id) DO NOTHING`,
				[eventId, userId]
			);
		}

		await client.query('COMMIT');
		console.log('Start-Events wurden erfolgreich angelegt.');
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Fehler beim Seed der Start-Events:', error);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
};

seedStartEvents();
