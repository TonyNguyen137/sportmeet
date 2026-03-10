import { geocodeAddress } from '../utils/geocode.js';
import { FLASH_KEYS, saveFlashAndRedirect } from '../utils/flash.js';
import {
	addCommentToEvent,
	createEventWithCreator,
	deleteEventByIdForCreator,
	findEditableEventByIdForCreator,
	findEventComments,
	findEventForUser,
	findEventParticipants,
	findNearbyPublicEvents,
	findSportById,
	isUserMemberOfGroup,
	joinEventForUser,
	leaveEventForUser,
	removeEventCommentByAdmin,
	removeEventParticipantByAdmin,
	updateEventByIdForCreator
} from '../model/events-model.js';
import { findAllSports, findMyEventsForUser } from '../model/dashboard-model.js';

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
	visibility: String(body.visibility || 'public').trim() === 'private' ? 'private' : 'public',
	groupId: String(body.groupId || '')
});

const buildEventFormValuesFromEvent = (event = {}) => {
	const startDate = event.start_datetime ? new Date(event.start_datetime) : null;
	const isValidDate = startDate instanceof Date && !Number.isNaN(startDate.getTime());

	return {
		sportId: event.sport_id != null ? String(event.sport_id) : event.custom_sport_name ? 'custom' : '',
		customSportName: String(event.custom_sport_name || '').trim(),
		title: String(event.title || '').trim(),
		date: isValidDate ? startDate.toISOString().slice(0, 10) : '',
		time: isValidDate
			? startDate.toLocaleTimeString('de-DE', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
					timeZone: 'UTC'
				})
			: '',
		street: String(event.street || '').trim(),
		houseNumber: String(event.house_number || '').trim(),
		postalCode: String(event.postal_code || '').trim(),
		city: String(event.city || '').trim(),
		locationName: String(event.location_name || '').trim(),
		description: String(event.description || '').trim(),
		visibility: event.is_public === false ? 'private' : 'public',
		groupId: event.group_id != null ? String(event.group_id) : ''
	};
};

const defaultDeps = {
	geocodeAddress,
	flashKeys: FLASH_KEYS,
	saveFlashAndRedirect,
	addCommentToEvent,
	createEventWithCreator,
	deleteEventByIdForCreator,
	findEditableEventByIdForCreator,
	findEventComments,
	findEventForUser,
	findEventParticipants,
	findNearbyPublicEvents,
	findSportById,
	findMyEventsForUser,
	findAllSports,
	isUserMemberOfGroup,
	joinEventForUser,
	leaveEventForUser,
	removeEventCommentByAdmin,
	removeEventParticipantByAdmin,
	updateEventByIdForCreator
};

export const createEventsController = (deps = defaultDeps) => {
	const {
		geocodeAddress: geocodeAddressValue,
		flashKeys,
		saveFlashAndRedirect: saveFlashAndRedirectValue,
		addCommentToEvent: addCommentToEventValue,
		createEventWithCreator: createEventWithCreatorValue,
		deleteEventByIdForCreator: deleteEventByIdForCreatorValue,
		findEditableEventByIdForCreator: findEditableEventByIdForCreatorValue,
		findEventComments: findEventCommentsValue,
		findEventForUser: findEventForUserValue,
		findEventParticipants: findEventParticipantsValue,
		findNearbyPublicEvents: findNearbyPublicEventsValue,
		findAllSports: findAllSportsValue,
		findMyEventsForUser: findMyEventsForUserValue,
		findSportById: findSportByIdValue,
		isUserMemberOfGroup: isUserMemberOfGroupValue,
		joinEventForUser: joinEventForUserValue,
		leaveEventForUser: leaveEventForUserValue,
		removeEventCommentByAdmin: removeEventCommentByAdminValue,
		removeEventParticipantByAdmin: removeEventParticipantByAdminValue,
		updateEventByIdForCreator: updateEventByIdForCreatorValue
	} = deps;

	const validateAndNormalizeEventInput = async ({ body, userId, redirectTo, req, res }) => {
		const redirectWithFeedback = ({ errorTitle = 'Bitte überprüfe deine Eingaben:', errors = [] }) =>
			saveFlashAndRedirectValue(req, res, {
				key: flashKeys.eventFormFeedback,
				payload: {
					errorTitle,
					errors,
					values: buildEventFormValues(body)
				},
				redirectTo
			});

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
		} = body;

		const missingRequiredErrors = [];
		const normalizedVisibility = String(visibility || 'public').trim() === 'private' ? 'private' : 'public';

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
			await redirectWithFeedback({ errors: missingRequiredErrors });
			return null;
		}

		const selectedSportId = String(sportId || '').trim();
		const normalizedCustomSportName = String(customSportName || '').trim();
		const isCustomSport = selectedSportId === 'custom';

		if (isCustomSport && !normalizedCustomSportName) {
			await redirectWithFeedback({ errors: ['Bitte gib eine eigene Sportart ein.'] });
			return null;
		}

		if (!isCustomSport && normalizedCustomSportName) {
			await redirectWithFeedback({
				errors: ['Bitte waehle entweder eine Sportart aus der Liste oder gib eine eigene Sportart ein.']
			});
			return null;
		}

		let groupIdForInsert = null;
		const isPublicEvent = normalizedVisibility === 'public';

		if (!isPublicEvent) {
			const parsedGroupId = Number.parseInt(String(groupId || ''), 10);
			if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
				await redirectWithFeedback({
					errors: ['Bitte waehle eine gueltige Gruppe fuer private Termine aus.']
				});
				return null;
			}

			const isMember = await isUserMemberOfGroupValue(parsedGroupId, userId);
			if (!isMember) {
				await redirectWithFeedback({
					errors: ['Du kannst nur private Termine in deinen eigenen Gruppen erstellen.']
				});
				return null;
			}

			groupIdForInsert = parsedGroupId;
		}

		let sportIdForInsert = null;
		let customSportNameForInsert = null;

		if (isCustomSport) {
			customSportNameForInsert = normalizedCustomSportName;
		} else {
			const parsedSportId = Number.parseInt(selectedSportId, 10);
			if (!Number.isInteger(parsedSportId) || parsedSportId <= 0) {
				const error = new Error('Ungueltige Sportart-ID');
				error.code = 'INVALID_SPORT_SELECTION';
				throw error;
			}

			const sportResult = await findSportByIdValue(parsedSportId);
			if (!sportResult) {
				const error = new Error('Die gewaehlte Sportart ist ungueltig.');
				error.code = 'INVALID_SPORT_SELECTION';
				throw error;
			}

			sportIdForInsert = parsedSportId;
		}

		let coordinates = null;
		try {
			coordinates = await geocodeAddressValue({
				street,
				houseNumber,
				postalCode,
				city,
				country: 'DE'
			});
		} catch (error) {
			error.code = 'GEOCODING_UNAVAILABLE';
			throw error;
		}

		if (!coordinates) {
			await redirectWithFeedback({
				errorTitle: 'Adresse nicht gefunden:',
				errors: [
					'Die angegebene Adresse konnte nicht gefunden werden. Bitte überprüfe Straße, Hausnummer, PLZ und Stadt.'
				]
			});
			return null;
		}

		return {
			title: String(title || '').trim(),
			description: String(description || '').trim() || null,
			sportId: sportIdForInsert,
			customSportName: customSportNameForInsert,
			startDatetime: `${date}T${time}:00`,
			locationName: String(locationName || '').trim() || null,
			street: String(street || '').trim(),
			houseNumber: String(houseNumber || '').trim(),
			postalCode: String(postalCode || '').trim(),
			city: String(city || '').trim(),
			country: 'DE',
			latitude: coordinates.latitude,
			longitude: coordinates.longitude,
			isPublic: isPublicEvent,
			groupId: groupIdForInsert
		};
	};

	const createEvent = async (req, res) => {
		const userId = req.session?.userId;
		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		try {
			const eventPayload = await validateAndNormalizeEventInput({
				body: req.body,
				userId,
				redirectTo: '/me',
				req,
				res
			});

			if (!eventPayload) {
				return null;
			}

			await createEventWithCreatorValue({
				...eventPayload,
				createdBy: userId
			});

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Termin wurde erfolgreich erstellt.'
				},
				redirectTo: '/me'
			});
		} catch (error) {
			console.error('Fehler beim Erstellen des Termins:', error);

			if (error.code === 'GEOCODING_UNAVAILABLE') {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'error',
						message: 'Adresse konnte aktuell nicht geprüft werden. Bitte später erneut versuchen.'
					},
					redirectTo: '/me'
				});
			}

			if (error.code === 'INVALID_SPORT_SELECTION') {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Die gewaehlte Sportart ist ungueltig.'
					},
					redirectTo: '/me'
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'error',
					message: 'Termin konnte nicht erstellt werden.'
				},
				redirectTo: '/me'
			});
		}
	};

	const getEditEventPage = async (req, res) => {
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
			const editableEvent = await findEditableEventByIdForCreatorValue(eventId, userId);
			if (!editableEvent) {
				return res.status(404).render('base', {
					title: '404 - Seite nicht gefunden',
					template: 'page-404'
				});
			}
			const sports = await findAllSportsValue();

			const eventFormFeedback = req.session?.[flashKeys.eventFormFeedback] || null;
			if (req.session?.[flashKeys.eventFormFeedback]) {
				delete req.session[flashKeys.eventFormFeedback];
			}

			return res.render('base', {
				title: `SportMeet - Termin bearbeiten`,
				template: 'page-edit-event',
				activeDashboardPage: 'events',
				eventId,
				eventFormFeedback,
				eventFormAction: `/events/${eventId}/edit`,
				eventFormTitle: 'Termin bearbeiten',
				eventFormDescription: 'Passe die Angaben deines Termins an.',
				eventFormSubmitLabel: 'Termin speichern',
				eventFormCancelUrl: `/events/${eventId}`,
				sports,
				eventFormValues: eventFormFeedback?.values || buildEventFormValuesFromEvent(editableEvent)
			});
		} catch (error) {
			console.error('Fehler beim Laden der Bearbeitungsseite:', error);
			return res.status(500).send('Server Fehler');
		}
	};

	const updateEvent = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);
		const redirectTo = `/events/${eventId}/edit`;

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!Number.isInteger(eventId) || eventId <= 0) {
			return res.status(400).send('Ungültige Termin-ID.');
		}

		try {
			const editableEvent = await findEditableEventByIdForCreatorValue(eventId, userId);
			if (!editableEvent) {
				return res.status(404).render('base', {
					title: '404 - Seite nicht gefunden',
					template: 'page-404'
				});
			}

			const eventPayload = await validateAndNormalizeEventInput({
				body: req.body,
				userId,
				redirectTo,
				req,
				res
			});

			if (!eventPayload) {
				return null;
			}

			const updated = await updateEventByIdForCreatorValue(eventId, userId, eventPayload);
			if (!updated) {
				return res.status(404).render('base', {
					title: '404 - Seite nicht gefunden',
					template: 'page-404'
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Termin wurde erfolgreich aktualisiert.'
				},
				redirectTo: `/events/${eventId}`
			});
		} catch (error) {
			console.error('Fehler beim Aktualisieren des Termins:', error);

			if (error.code === 'GEOCODING_UNAVAILABLE') {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'error',
						message: 'Adresse konnte aktuell nicht geprüft werden. Bitte später erneut versuchen.'
					},
					redirectTo
				});
			}

			if (error.code === 'INVALID_SPORT_SELECTION') {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Die gewaehlte Sportart ist ungueltig.'
					},
					redirectTo
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'error',
					message: 'Termin konnte nicht aktualisiert werden.'
				},
				redirectTo
			});
		}
	};

	const getEventById = async (req, res) => {
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
			const event = await findEventForUserValue(eventId, userId);
			if (!event) {
				return res.status(404).render('base', {
					title: '404 - Seite nicht gefunden',
					template: 'page-404'
				});
			}

			const participants = await findEventParticipantsValue(eventId, userId);
			const comments = await findEventCommentsValue(eventId, userId, 200);

			return res.render('base', {
				title: `SportMeet - Termin ${event.title}`,
				template: 'single-event',
				activeDashboardPage: 'events',
				event,
				participants,
				comments
			});
		} catch (error) {
			console.error('Fehler beim Laden des Termins:', error);
			return res.status(500).send('Server Fehler');
		}
	};

	const getNearbyPublicEvents = async (req, res) => {
		const userId = req.session?.userId;
		const latitude = Number(req.query?.lat);
		const longitude = Number(req.query?.lng);
		const radiusKmRaw = Number(req.query?.radiusKm ?? 10);
		const radiusKm = Number.isFinite(radiusKmRaw) && radiusKmRaw > 0 ? Math.min(radiusKmRaw, 50) : 10;

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return res.status(400).json({ error: 'Ungültige Koordinaten.' });
		}

		try {
			const events = await findNearbyPublicEventsValue({
				userId,
				latitude,
				longitude,
				radiusKm,
				limit: 60
			});

			return res.json({ events });
		} catch (error) {
			console.error('Fehler beim Laden öffentlicher Termine in der Nähe:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const getVisibleEvents = async (req, res) => {
		const userId = req.session?.userId;

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		try {
			const events = await findMyEventsForUserValue(userId, 100);
			return res.json({ events });
		} catch (error) {
			console.error('Fehler beim Laden relevanter Termine:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const getEventParticipantsList = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(eventId) || eventId <= 0) {
			return res.status(400).json({ error: 'Ungültige Termin-ID.' });
		}

		try {
			const event = await findEventForUserValue(eventId, userId);
			if (!event) {
				return res.status(404).json({ error: 'Termin nicht gefunden.' });
			}

			const participants = await findEventParticipantsValue(eventId, userId);
			return res.json({ participants });
		} catch (error) {
			console.error('Fehler beim Laden der Teilnehmerliste:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const getEventCommentsList = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(eventId) || eventId <= 0) {
			return res.status(400).json({ error: 'Ungültige Termin-ID.' });
		}

		try {
			const event = await findEventForUserValue(eventId, userId);
			if (!event) {
				return res.status(404).json({ error: 'Termin nicht gefunden.' });
			}

			const comments = await findEventCommentsValue(eventId, userId, 200);
			return res.json({ comments });
		} catch (error) {
			console.error('Fehler beim Laden der Kommentare:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const joinEvent = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!Number.isInteger(eventId) || eventId <= 0) {
			return res.status(400).send('Ungültige Termin-ID.');
		}

		try {
			const joined = await joinEventForUserValue(eventId, userId);

			if (!joined) {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Teilnahme war nicht möglich.'
					},
					redirectTo: `/events/${eventId}`
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Du nimmst jetzt am Termin teil.'
				},
				redirectTo: `/events/${eventId}`
			});
		} catch (error) {
			console.error('Fehler beim Teilnehmen:', error);
			return res.status(500).send('Server Fehler');
		}
	};

	const leaveEvent = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!Number.isInteger(eventId) || eventId <= 0) {
			return res.status(400).send('Ungültige Termin-ID.');
		}

		try {
			const left = await leaveEventForUserValue(eventId, userId);

			if (!left) {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Du konntest nicht ausgetragen werden (als Admin bleibst du automatisch Teilnehmer).'
					},
					redirectTo: `/events/${eventId}`
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Du nimmst nicht mehr am Termin teil.'
				},
				redirectTo: `/events/${eventId}`
			});
		} catch (error) {
			console.error('Fehler beim Austragen:', error);
			return res.status(500).send('Server Fehler');
		}
	};

	const createEventComment = async (req, res) => {
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
			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'warning',
					message: 'Bitte gib eine Nachricht ein.'
				},
				redirectTo: `/events/${eventId}`
			});
		}

		if (content.length > 2000) {
			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'warning',
					message: 'Die Nachricht ist zu lang (max. 2000 Zeichen).'
				},
				redirectTo: `/events/${eventId}`
			});
		}

		try {
			const added = await addCommentToEventValue(eventId, userId, content);

			if (!added) {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Nachricht konnte nicht gesendet werden.'
					},
					redirectTo: `/events/${eventId}`
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Nachricht gesendet.'
				},
				redirectTo: `/events/${eventId}`
			});
		} catch (error) {
			console.error('Fehler beim Senden der Nachricht:', error);
			return res.status(500).send('Server Fehler');
		}
	};

	const removeEventParticipant = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);
		const participantId = Number(req.params.participantId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(participantId) || participantId <= 0) {
			return res.status(400).json({ error: 'Ungültige Anfrage.' });
		}

		try {
			const result = await removeEventParticipantByAdminValue(eventId, participantId, userId);

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

			req.session[flashKeys.toast] = {
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
		} catch (error) {
			console.error('Fehler beim Entfernen eines Teilnehmers:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const removeEventComment = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);
		const commentId = Number(req.params.commentId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(commentId) || commentId <= 0) {
			return res.status(400).json({ error: 'Ungültige Anfrage.' });
		}

		try {
			const result = await removeEventCommentByAdminValue(eventId, commentId, userId);

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

			req.session[flashKeys.toast] = {
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
		} catch (error) {
			console.error('Fehler beim Löschen einer Nachricht:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const deleteEvent = async (req, res) => {
		const userId = req.session?.userId;
		const eventId = Number(req.params.eventId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(eventId) || eventId <= 0) {
			return res.status(400).json({ error: 'Ungültige Termin-ID.' });
		}

		try {
			const didDelete = await deleteEventByIdForCreatorValue(eventId, userId);

			if (!didDelete) {
				return res.status(404).json({ error: 'Termin nicht gefunden.' });
			}

			req.session[flashKeys.toast] = {
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
		} catch (error) {
			console.error('Fehler beim Löschen des Termins:', error);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	return {
		createEvent,
		createEventComment,
		deleteEvent,
		getEditEventPage,
		getEventCommentsList,
		getEventById,
		getEventParticipantsList,
		getNearbyPublicEvents,
		getVisibleEvents,
		joinEvent,
		leaveEvent,
		removeEventComment,
		removeEventParticipant,
		updateEvent
	};
};

export const {
	createEvent,
	createEventComment,
	deleteEvent,
	getEditEventPage,
	getEventCommentsList,
	getEventById,
	getEventParticipantsList,
	getNearbyPublicEvents,
	getVisibleEvents,
	joinEvent,
	leaveEvent,
	removeEventComment,
	removeEventParticipant,
	updateEvent
} = createEventsController();
