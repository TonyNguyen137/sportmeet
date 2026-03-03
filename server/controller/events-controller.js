import { geocodeAddress } from '../utils/geocode.js';
import { FLASH_KEYS, saveFlashAndRedirect } from '../utils/flash.js';
import {
	addCommentToEvent,
	createEventWithCreator,
	findEventComments,
	findEventForUser,
	findEventParticipants,
	findNearbyPublicEvents,
	findSportById,
	isUserMemberOfGroup,
	deleteEventByIdForCreator,
	joinEventForUser,
	leaveEventForUser,
	removeEventCommentByAdmin,
	removeEventParticipantByAdmin
} from '../model/events-model.js';

export const createEvent = async (req, res) => {
	const buildEventFormValues = (body = {}) => ({
		sportId: String(body.sportId || ''),
		customSportName: String(body.customSportName || '').trim(),
		title: String(body.title || '').trim(),
		date: String(body.date || ''),
		time: String(body.time || ''),
		street: String(body.street || '').trim(),
		houseNumber: String(body.houseNumber || '').trim(),
		postalCode: String(body.postalCode || '').trim(),
		city: String(body.city || '').trim(),
		locationName: String(body.locationName || '').trim(),
		description: String(body.description || '').trim(),
		visibility:
			String(body.visibility || 'public').trim() === 'private' ? 'private' : 'public',
		groupId: String(body.groupId || '')
	});

	const redirectToEvents = (variant, message) =>
		saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.toast,
			payload: { variant, message },
			redirectTo: '/me'
		});
	const redirectToEventFormWithFeedback = ({
		errorTitle = 'Bitte überprüfe deine Eingaben:',
		errors = [],
		values = {}
	} = {}) =>
		saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.eventFormFeedback,
			payload: { errorTitle, errors, values },
			redirectTo: '/me'
		});

	const userId = req.session?.userId;
	const {
		sportId,
		customSportName,
		title,
		date,
		time,
		street,
		houseNumber,
		postalCode,
		city,
		locationName,
		description,
		visibility,
		groupId
	} = req.body;

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	const missingRequiredErrors = [];
	const normalizedVisibility =
		String(visibility || 'public').trim() === 'private' ? 'private' : 'public';
	if (!String(sportId || '').trim()) missingRequiredErrors.push('Sportart auswählen');
	if (!String(title || '').trim()) missingRequiredErrors.push('Titel des Termins');
	if (!String(date || '').trim()) missingRequiredErrors.push('Datum');
	if (!String(time || '').trim()) missingRequiredErrors.push('Uhrzeit');
	if (!String(street || '').trim()) missingRequiredErrors.push('Adresse');
	if (!String(houseNumber || '').trim()) missingRequiredErrors.push('Hausnummer');
	if (!String(postalCode || '').trim()) missingRequiredErrors.push('PLZ');
	if (!String(city || '').trim()) missingRequiredErrors.push('Stadt');
	if (normalizedVisibility === 'private' && !String(groupId || '').trim()) {
		missingRequiredErrors.push('Gruppe auswählen');
	}

	if (missingRequiredErrors.length > 0) {
		return redirectToEventFormWithFeedback({
			errorTitle: 'Bitte überprüfe deine Eingaben:',
			errors: missingRequiredErrors,
			values: buildEventFormValues(req.body)
		});
	}

	const selectedSportId = String(sportId).trim();
	const normalizedCustomSportName = String(customSportName || '').trim();
	const isCustomSport = selectedSportId === 'custom';

	if (isCustomSport && !normalizedCustomSportName) {
		return redirectToEventFormWithFeedback({
			errorTitle: 'Bitte überprüfe deine Eingaben:',
			errors: ['Bitte gib eine eigene Sportart ein.'],
			values: buildEventFormValues(req.body)
		});
	}

	if (!isCustomSport && normalizedCustomSportName) {
		return redirectToEventFormWithFeedback({
			errorTitle: 'Bitte überprüfe deine Eingaben:',
			errors: [
				'Bitte waehle entweder eine Sportart aus der Liste oder gib eine eigene Sportart ein.'
			],
			values: buildEventFormValues(req.body)
		});
	}

	let groupIdForInsert = null;
	const isPublicEvent = normalizedVisibility === 'public';

	if (!isPublicEvent) {
		const parsedGroupId = Number.parseInt(String(groupId || ''), 10);
		if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
			return redirectToEventFormWithFeedback({
				errorTitle: 'Bitte überprüfe deine Eingaben:',
				errors: ['Bitte waehle eine gueltige Gruppe fuer private Termine aus.'],
				values: buildEventFormValues(req.body)
			});
		}

		const isMember = await isUserMemberOfGroup(parsedGroupId, userId);
		if (!isMember) {
			return redirectToEventFormWithFeedback({
				errorTitle: 'Bitte überprüfe deine Eingaben:',
				errors: ['Du kannst nur private Termine in deinen eigenen Gruppen erstellen.'],
				values: buildEventFormValues(req.body)
			});
		}

		groupIdForInsert = parsedGroupId;
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
		return redirectToEvents(
			'error',
			'Adresse konnte aktuell nicht geprüft werden. Bitte später erneut versuchen.'
		);
	}

	if (!coordinates) {
		return redirectToEventFormWithFeedback({
			errorTitle: 'Adresse nicht gefunden:',
			errors: [
				'Die angegebene Adresse konnte nicht gefunden werden. Bitte überprüfe Straße, Hausnummer, PLZ und Stadt.'
			],
			values: buildEventFormValues(req.body)
		});
	}

	try {
		let sportIdForInsert = null;
		let customSportNameForInsert = null;

		if (isCustomSport) {
			customSportNameForInsert = normalizedCustomSportName;
		} else {
			const parsedSportId = Number.parseInt(selectedSportId, 10);

			if (!Number.isInteger(parsedSportId) || parsedSportId <= 0) {
				throw new Error('Ungueltige Sportart-ID');
			}

			const sportResult = await findSportById(parsedSportId);

			if (!sportResult) {
				const error = new Error('Die gewaehlte Sportart ist ungueltig.');
				error.code = 'INVALID_SPORT_SELECTION';
				throw error;
			}

			sportIdForInsert = parsedSportId;
		}

		await createEventWithCreator({
			title,
			description: description || null,
			sportId: sportIdForInsert,
			customSportName: customSportNameForInsert,
			startDatetime,
			locationName: locationName || null,
			street,
			houseNumber,
			postalCode,
			city,
			country,
			latitude: coordinates.latitude,
			longitude: coordinates.longitude,
			isPublic: isPublicEvent,
			groupId: groupIdForInsert,
			createdBy: userId
		});
		return redirectToEvents('success', 'Termin wurde erfolgreich erstellt.');
	} catch (err) {
		console.error('Fehler beim Erstellen des Termins:', err);

		if (
			err.code === 'INVALID_SPORT_SELECTION' ||
			err.message === 'Ungueltige Sportart-ID'
		) {
			return redirectToEvents('warning', 'Die gewaehlte Sportart ist ungueltig.');
		}

		return redirectToEvents('error', 'Termin konnte nicht erstellt werden.');
	}
};

export const getEventById = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!Number.isInteger(eventId) || eventId <= 0) {
		return res.status(404).render('base', {
			title: '404 - Seite nicht gefunden',
			template: 'page-404'
		});
	}

	try {
		const event = await findEventForUser(eventId, userId);
		if (!event) {
			return res.status(404).render('base', {
				title: '404 - Seite nicht gefunden',
				template: 'page-404'
			});
		}

		const participants = await findEventParticipants(eventId, userId);
		const comments = await findEventComments(eventId, userId, 200);

		return res.render('base', {
			title: `SportMeet - Termin ${event.title}`,
			template: 'single-event',
			activeDashboardPage: 'events',
			event,
			participants,
			comments
		});
	} catch (err) {
		console.error('Fehler beim Laden des Termins:', err);
		return res.status(500).send('Server Fehler');
	}
};

export const getNearbyPublicEvents = async (req, res) => {
	const userId = req.session?.userId;
	const latitude = Number(req.query?.lat);
	const longitude = Number(req.query?.lng);
	const radiusKmRaw = Number(req.query?.radiusKm ?? 10);
	const radiusKm =
		Number.isFinite(radiusKmRaw) && radiusKmRaw > 0 ? Math.min(radiusKmRaw, 50) : 10;

	if (!userId) {
		return res.status(401).json({ error: 'Nicht autorisiert' });
	}

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return res.status(400).json({ error: 'Ungültige Koordinaten.' });
	}

	try {
		const events = await findNearbyPublicEvents({
			userId,
			latitude,
			longitude,
			radiusKm,
			limit: 60
		});

		return res.json({ events });
	} catch (err) {
		console.error('Fehler beim Laden öffentlicher Termine in der Nähe:', err);
		return res.status(500).json({ error: 'Server Fehler' });
	}
};

export const joinEvent = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!Number.isInteger(eventId) || eventId <= 0) {
		return res.status(400).send('Ungültige Termin-ID.');
	}

	try {
		const joined = await joinEventForUser(eventId, userId);

		if (!joined) {
			return saveFlashAndRedirect(req, res, {
				key: FLASH_KEYS.toast,
				payload: {
					variant: 'warning',
					message: 'Teilnahme war nicht möglich.'
				},
				redirectTo: `/events/${eventId}`
			});
		}

		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.toast,
			payload: {
				variant: 'success',
				message: 'Du nimmst jetzt am Termin teil.'
			},
			redirectTo: `/events/${eventId}`
		});
	} catch (err) {
		console.error('Fehler beim Teilnehmen:', err);
		return res.status(500).send('Server Fehler');
	}
};

export const leaveEvent = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!Number.isInteger(eventId) || eventId <= 0) {
		return res.status(400).send('Ungültige Termin-ID.');
	}

	try {
		const left = await leaveEventForUser(eventId, userId);

		if (!left) {
			return saveFlashAndRedirect(req, res, {
				key: FLASH_KEYS.toast,
				payload: {
					variant: 'warning',
					message:
						'Du konntest nicht ausgetragen werden (als Admin bleibst du automatisch Teilnehmer).'
				},
				redirectTo: `/events/${eventId}`
			});
		}

		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.toast,
			payload: {
				variant: 'success',
				message: 'Du nimmst nicht mehr am Termin teil.'
			},
			redirectTo: `/events/${eventId}`
		});
	} catch (err) {
		console.error('Fehler beim Austragen:', err);
		return res.status(500).send('Server Fehler');
	}
};

export const createEventComment = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);
	const content = String(req.body.content || '').trim();

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!Number.isInteger(eventId) || eventId <= 0) {
		return res.status(400).send('Ungültige Termin-ID.');
	}

	if (!content) {
		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.toast,
			payload: {
				variant: 'warning',
				message: 'Bitte gib eine Nachricht ein.'
			},
			redirectTo: `/events/${eventId}`
		});
	}

	if (content.length > 2000) {
		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.toast,
			payload: {
				variant: 'warning',
				message: 'Die Nachricht ist zu lang (max. 2000 Zeichen).'
			},
			redirectTo: `/events/${eventId}`
		});
	}

	try {
		const added = await addCommentToEvent(eventId, userId, content);

		if (!added) {
			return saveFlashAndRedirect(req, res, {
				key: FLASH_KEYS.toast,
				payload: {
					variant: 'warning',
					message: 'Nachricht konnte nicht gesendet werden.'
				},
				redirectTo: `/events/${eventId}`
			});
		}

		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.toast,
			payload: {
				variant: 'success',
				message: 'Nachricht gesendet.'
			},
			redirectTo: `/events/${eventId}`
		});
	} catch (err) {
		console.error('Fehler beim Senden der Nachricht:', err);
		return res.status(500).send('Server Fehler');
	}
};

export const removeEventParticipant = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);
	const participantId = Number(req.params.participantId);

	if (!userId) {
		return res.status(401).json({ error: 'Nicht autorisiert' });
	}

	if (
		!Number.isInteger(eventId) ||
		eventId <= 0 ||
		!Number.isInteger(participantId) ||
		participantId <= 0
	) {
		return res.status(400).json({ error: 'Ungültige Anfrage.' });
	}

	try {
		const result = await removeEventParticipantByAdmin(eventId, participantId, userId);

		if (!result.ok) {
			if (result.code === 'EVENT_EXPIRED') {
				return res.status(400).json({
					error: 'Termin ist abgelaufen. Nur Löschen ist noch möglich.'
				});
			}
			if (result.code === 'CANNOT_REMOVE_ADMIN') {
				return res.status(400).json({ error: 'Admin kann nicht entfernt werden.' });
			}
			if (result.code === 'PARTICIPANT_NOT_FOUND') {
				return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
			}
			if (result.code === 'EVENT_NOT_FOUND') {
				return res.status(404).json({ error: 'Termin nicht gefunden.' });
			}
			return res.status(403).json({ error: 'Nicht erlaubt.' });
		}

		req.session[FLASH_KEYS.toast] = {
			variant: 'success',
			message: 'Teilnehmer wurde entfernt.'
		};

		return req.session.save((sessionError) => {
			if (sessionError) {
				console.error('Session save error:', sessionError);
				return res.status(500).json({ error: 'Server Fehler' });
			}

			return res.status(200).json({ ok: true });
		});
	} catch (err) {
		console.error('Fehler beim Entfernen eines Teilnehmers:', err);
		return res.status(500).json({ error: 'Server Fehler' });
	}
};

export const removeEventComment = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);
	const commentId = Number(req.params.commentId);

	if (!userId) {
		return res.status(401).json({ error: 'Nicht autorisiert' });
	}

	if (
		!Number.isInteger(eventId) ||
		eventId <= 0 ||
		!Number.isInteger(commentId) ||
		commentId <= 0
	) {
		return res.status(400).json({ error: 'Ungültige Anfrage.' });
	}

	try {
		const result = await removeEventCommentByAdmin(eventId, commentId, userId);

		if (!result.ok) {
			if (result.code === 'EVENT_EXPIRED') {
				return res.status(400).json({
					error: 'Termin ist abgelaufen. Nur Löschen ist noch möglich.'
				});
			}
			if (result.code === 'COMMENT_NOT_FOUND') {
				return res.status(404).json({ error: 'Nachricht nicht gefunden.' });
			}
			if (result.code === 'EVENT_NOT_FOUND') {
				return res.status(404).json({ error: 'Termin nicht gefunden.' });
			}
			return res.status(403).json({ error: 'Nicht erlaubt.' });
		}

		req.session[FLASH_KEYS.toast] = {
			variant: 'success',
			message: 'Nachricht wurde gelöscht.'
		};

		return req.session.save((sessionError) => {
			if (sessionError) {
				console.error('Session save error:', sessionError);
				return res.status(500).json({ error: 'Server Fehler' });
			}

			return res.status(200).json({ ok: true });
		});
	} catch (err) {
		console.error('Fehler beim Löschen einer Nachricht:', err);
		return res.status(500).json({ error: 'Server Fehler' });
	}
};

export const deleteEvent = async (req, res) => {
	const userId = req.session?.userId;
	const eventId = Number(req.params.eventId);

	if (!userId) {
		return res.status(401).json({ error: 'Nicht autorisiert' });
	}

	if (!Number.isInteger(eventId) || eventId <= 0) {
		return res.status(400).json({ error: 'Ungültige Termin-ID.' });
	}

	try {
		const didDelete = await deleteEventByIdForCreator(eventId, userId);

		if (!didDelete) {
			return res.status(404).json({ error: 'Termin nicht gefunden.' });
		}

		req.session[FLASH_KEYS.toast] = {
			variant: 'success',
			message: 'Termin wurde erfolgreich gelöscht.'
		};

		return req.session.save((sessionError) => {
			if (sessionError) {
				console.error('Session save error:', sessionError);
				return res.status(500).json({ error: 'Server Fehler' });
			}

			return res.status(200).json({ ok: true });
		});
	} catch (err) {
		console.error('Fehler beim Löschen des Termins:', err);
		return res.status(500).json({ error: 'Server Fehler' });
	}
};
