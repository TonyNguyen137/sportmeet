import express from 'express';
import pool from '../models/db.js';
import { checkAuth, formParser } from '../utils/auth.js';
import { geocodeAddress } from '../utils/geocode.js';

const router = express.Router();

router.post('/', checkAuth, formParser, async (req, res) => {
	const userId = req.session?.userId;
	const {
		sport,
		title,
		date,
		time,
		street,
		houseNumber,
		postalCode,
		city,
		locationName,
		description
	} = req.body;

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!sport || !title || !date || !time || !street || !houseNumber || !postalCode || !city) {
		return res.status(400).send('Bitte alle Pflichtfelder ausfuellen.');
	}

	const startDatetime = `${date}T${time}:00`;
	const country = 'DE';
	let coordinates = null;

	try {
		coordinates = await geocodeAddress({
			street,
			houseNumber,
			postalCode,
			city,
			country
		});
	} catch (err) {
		console.error('Geocoding Fehler:', err);
		return res.status(502).send('Adresse konnte aktuell nicht geprueft werden. Bitte spaeter erneut versuchen.');
	}

	if (!coordinates) {
		return res.status(422).send('Adresse konnte nicht gefunden werden. Bitte Eingaben pruefen.');
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const insertEventQuery = `
			INSERT INTO events (
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
				$1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, NULL, $13
			)
			RETURNING id;
		`;

		const eventValues = [
			title,
			description || null,
			sport,
			startDatetime,
			locationName || null,
			street,
			houseNumber,
			postalCode,
			city,
			country,
			coordinates.latitude,
			coordinates.longitude,
			userId
		];

		const eventResult = await client.query(insertEventQuery, eventValues);
		const eventId = eventResult.rows[0].id;

		await client.query(
			`INSERT INTO event_participants (event_id, user_id, status)
			 VALUES ($1, $2, 'accepted')`,
			[eventId, userId]
		);

		await client.query('COMMIT');
		return res.redirect('/me?eventCreated=true');
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Fehler beim Erstellen des Termins:', err);
		return res.status(500).send('Server Fehler');
	} finally {
		client.release();
	}
});

export default router;
