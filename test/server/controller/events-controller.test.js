import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventsController } from '../../../server/controller/events-controller.js';

const flashKeys = {
	toast: 'toast',
	eventFormFeedback: 'eventFormFeedback'
};

const createReq = ({ body = {}, query = {}, params = {}, session = {} } = {}) => ({
	body,
	query,
	params,
	session: {
		userId: 5,
		save(callback) {
			callback(null);
		},
		...session
	}
});

const createRes = () => ({
	statusCode: null,
	body: null,
	jsonBody: null,
	rendered: null,
	status(code) {
		this.statusCode = code;
		return this;
	},
	send(body) {
		this.body = body;
		return body;
	},
	json(payload) {
		this.jsonBody = payload;
		return payload;
	},
	render(view, payload) {
		this.rendered = { view, payload };
		return this.rendered;
	}
});

const createController = (overrides = {}) => {
	const flashCalls = [];
	const deps = {
		geocodeAddress: async () => ({ latitude: 52.52, longitude: 13.405 }),
		flashKeys,
		saveFlashAndRedirect: async (req, res, payload) => {
			flashCalls.push(payload);
			return payload;
		},
		addCommentToEvent: async () => true,
		createEventWithCreator: async () => {},
		findEventComments: async () => [],
		findEventForUser: async () => null,
		findEventParticipants: async () => [],
		findEditableEventByIdForCreator: async () => ({ id: 9, created_by: 5 }),
		findNearbyPublicEvents: async () => [],
		findSportById: async () => ({ id: 1, name: 'Laufen' }),
		isUserMemberOfGroup: async () => true,
		deleteEventByIdForCreator: async () => true,
		joinEventForUser: async () => true,
		leaveEventForUser: async () => true,
		removeEventCommentByAdmin: async () => ({ ok: true }),
		removeEventParticipantByAdmin: async () => ({ ok: true }),
		updateEventByIdForCreator: async () => true,
		...overrides
	};

	return { flashCalls, controller: createEventsController(deps) };
};

const validBody = {
	sportId: '1',
	customSportName: '',
	title: 'Abendlauf',
	date: '2026-03-10',
	time: '18:30',
	street: 'Musterstrasse',
	houseNumber: '12',
	postalCode: '10115',
	city: 'Berlin',
	locationName: 'Park',
	description: 'Locker',
	visibility: 'public',
	groupId: ''
};

const withMutedConsoleError = async (fn) => {
	const originalConsoleError = console.error;
	console.error = () => {};

	try {
		return await fn();
	} finally {
		console.error = originalConsoleError;
	}
};

test('createEvent lehnt anonyme Requests ab', async () => {
	const { controller } = createController();
	const res = createRes();

	await controller.createEvent(createReq({ body: validBody, session: { userId: null } }), res);

	assert.equal(res.statusCode, 401);
	assert.equal(res.body, 'Nicht autorisiert');
});

test('createEvent validiert fehlende Pflichtfelder und spiegelt Formularwerte', async () => {
	const { controller, flashCalls } = createController();

	await controller.createEvent(createReq({ body: { ...validBody, sportId: '', title: '', city: '' } }), createRes());

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.eventFormFeedback,
		payload: {
			errorTitle: 'Bitte überprüfe deine Eingaben:',
			errors: ['Sportart auswählen', 'Titel des Termins', 'Stadt'],
			values: {
				sportId: '',
				customSportName: '',
				title: '',
				date: '2026-03-10',
				time: '18:30',
				street: 'Musterstrasse',
				houseNumber: '12',
				postalCode: '10115',
				city: '',
				locationName: 'Park',
				description: 'Locker',
				visibility: 'public',
				groupId: ''
			}
		},
		redirectTo: '/me'
	});
});

test('createEvent verlangt Custom-Sportnamen bei custom-Auswahl', async () => {
	const { controller, flashCalls } = createController();

	await controller.createEvent(
		createReq({ body: { ...validBody, sportId: 'custom', customSportName: '  ' } }),
		createRes()
	);

	assert.equal(flashCalls[0].payload.errors[0], 'Bitte gib eine eigene Sportart ein.');
});

test('createEvent blockiert private Termine fuer Nicht-Mitglieder', async () => {
	const { controller, flashCalls } = createController({
		isUserMemberOfGroup: async () => false
	});

	await controller.createEvent(
		createReq({
			body: { ...validBody, visibility: 'private', groupId: '22' }
		}),
		createRes()
	);

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.eventFormFeedback,
		payload: {
			errorTitle: 'Bitte überprüfe deine Eingaben:',
			errors: ['Du kannst nur private Termine in deinen eigenen Gruppen erstellen.'],
			values: {
				...validBody,
				visibility: 'private',
				groupId: '22'
			}
		},
		redirectTo: '/me'
	});
});

test('createEvent reagiert sauber auf Geocoding-Ausfall', async () => {
	const { controller, flashCalls } = createController({
		geocodeAddress: async () => {
			throw new Error('network');
		}
	});

	await withMutedConsoleError(() => controller.createEvent(createReq({ body: validBody }), createRes()));

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'error',
			message: 'Adresse konnte aktuell nicht geprüft werden. Bitte später erneut versuchen.'
		},
		redirectTo: '/me'
	});
});

test('createEvent meldet nicht gefundene Adresse als Formularfehler', async () => {
	const { controller, flashCalls } = createController({
		geocodeAddress: async () => null
	});

	await controller.createEvent(createReq({ body: validBody }), createRes());

	assert.equal(flashCalls[0].key, flashKeys.eventFormFeedback);
	assert.equal(flashCalls[0].payload.errorTitle, 'Adresse nicht gefunden:');
});

test('createEvent meldet ungueltige Sportart mit Warning-Toast', async () => {
	const { controller, flashCalls } = createController({
		findSportById: async () => null
	});

	await withMutedConsoleError(() => controller.createEvent(createReq({ body: validBody }), createRes()));

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'warning',
			message: 'Die gewaehlte Sportart ist ungueltig.'
		},
		redirectTo: '/me'
	});
});

test('createEvent erstellt oeffentlichen Termin mit normalisierten Daten', async () => {
	const createCalls = [];
	const { controller, flashCalls } = createController({
		createEventWithCreator: async (payload) => {
			createCalls.push(payload);
		}
	});

	await controller.createEvent(createReq({ body: validBody }), createRes());

	assert.deepEqual(createCalls, [
		{
			title: 'Abendlauf',
			description: 'Locker',
			sportId: 1,
			customSportName: null,
			startDatetime: '2026-03-10T18:30:00',
			locationName: 'Park',
			street: 'Musterstrasse',
			houseNumber: '12',
			postalCode: '10115',
			city: 'Berlin',
			country: 'DE',
			latitude: 52.52,
			longitude: 13.405,
			isPublic: true,
			groupId: null,
			createdBy: 5
		}
	]);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'success',
			message: 'Termin wurde erfolgreich erstellt.'
		},
		redirectTo: '/me'
	});
});

test('getNearbyPublicEvents validiert Koordinaten', async () => {
	const { controller } = createController();
	const res = createRes();

	await controller.getNearbyPublicEvents(createReq({ query: { lat: 'nope', lng: '13.4' } }), res);

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.jsonBody, { error: 'Ungültige Koordinaten.' });
});

test('getNearbyPublicEvents begrenzt Radius auf 50km', async () => {
	const calls = [];
	const { controller } = createController({
		findNearbyPublicEvents: async (payload) => {
			calls.push(payload);
			return [{ id: 1 }];
		}
	});
	const res = createRes();

	await controller.getNearbyPublicEvents(createReq({ query: { lat: '52.5', lng: '13.4', radiusKm: '120' } }), res);

	assert.deepEqual(calls, [
		{
			userId: 5,
			latitude: 52.5,
			longitude: 13.4,
			radiusKm: 50,
			limit: 60
		}
	]);
	assert.deepEqual(res.jsonBody, { events: [{ id: 1 }] });
});

test('createEventComment validiert leere Kommentare', async () => {
	const { controller, flashCalls } = createController();

	await controller.createEventComment(createReq({ params: { eventId: '9' }, body: { content: '   ' } }), createRes());

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'warning',
			message: 'Bitte gib eine Nachricht ein.'
		},
		redirectTo: '/events/9'
	});
});

test('getVisibleEvents liefert relevante Termine als JSON', async () => {
	const { controller } = createController({
		findMyEventsForUser: async () => [{ id: 1, title: 'Abendlauf' }]
	});
	const res = createRes();

	await controller.getVisibleEvents(createReq(), res);

	assert.equal(res.statusCode, null);
	assert.deepEqual(res.jsonBody, {
		events: [{ id: 1, title: 'Abendlauf' }]
	});
});

test('getEventParticipantsList liefert 404 fuer unbekannten Termin', async () => {
	const { controller } = createController({
		findEventForUser: async () => null
	});
	const res = createRes();

	await controller.getEventParticipantsList(createReq({ params: { eventId: '9' } }), res);

	assert.equal(res.statusCode, 404);
	assert.deepEqual(res.jsonBody, { error: 'Termin nicht gefunden.' });
});

test('getEventParticipantsList liefert Teilnehmer als JSON', async () => {
	const { controller } = createController({
		findEventForUser: async () => ({ id: 9 }),
		findEventParticipants: async () => [{ id: 5, first_name: 'Tony' }]
	});
	const res = createRes();

	await controller.getEventParticipantsList(createReq({ params: { eventId: '9' } }), res);

	assert.deepEqual(res.jsonBody, {
		participants: [{ id: 5, first_name: 'Tony' }]
	});
});

test('getEventCommentsList liefert Kommentare als JSON', async () => {
	const { controller } = createController({
		findEventForUser: async () => ({ id: 9 }),
		findEventComments: async () => [{ id: 3, content: 'Hallo Team' }]
	});
	const res = createRes();

	await controller.getEventCommentsList(createReq({ params: { eventId: '9' } }), res);

	assert.deepEqual(res.jsonBody, {
		comments: [{ id: 3, content: 'Hallo Team' }]
	});
});

test('updateEvent aktualisiert Termin und setzt Erfolgs-Flash', async () => {
	const updateCalls = [];
	const { controller, flashCalls } = createController({
		updateEventByIdForCreator: async (eventId, userId, payload) => {
			updateCalls.push({ eventId, userId, payload });
			return true;
		}
	});

	await controller.updateEvent(createReq({ params: { eventId: '9' }, body: validBody }), createRes());

	assert.deepEqual(updateCalls, [
		{
			eventId: 9,
			userId: 5,
			payload: {
				title: 'Abendlauf',
				description: 'Locker',
				sportId: 1,
				customSportName: null,
				startDatetime: '2026-03-10T18:30:00',
				locationName: 'Park',
				street: 'Musterstrasse',
				houseNumber: '12',
				postalCode: '10115',
				city: 'Berlin',
				country: 'DE',
				latitude: 52.52,
				longitude: 13.405,
				isPublic: true,
				groupId: null
			}
		}
	]);
	assert.deepEqual(flashCalls.at(-1), {
		key: flashKeys.toast,
		payload: {
			variant: 'success',
			message: 'Termin wurde erfolgreich aktualisiert.'
		},
		redirectTo: '/events/9'
	});
});

test('deleteEvent liefert ok JSON und setzt Success-Toast in Session', async () => {
	const { controller } = createController();
	const req = createReq({ params: { eventId: '9' } });
	const res = createRes();

	await controller.deleteEvent(req, res);

	assert.deepEqual(req.session.toast, {
		variant: 'success',
		message: 'Termin wurde erfolgreich gelöscht.'
	});
	assert.equal(res.statusCode, 200);
	assert.deepEqual(res.jsonBody, { ok: true });
});
