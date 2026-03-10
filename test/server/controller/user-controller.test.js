import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserController } from '../../../server/controller/user-controller.js';

const flashKeys = {
	profileFeedback: 'profileFeedback'
};

const createReq = ({ body = {}, session = {} } = {}) => ({
	body,
	session: {
		userId: 5,
		save(callback) {
			callback(null);
		},
		destroy(callback) {
			callback(null);
		},
		...session
	}
});

const createRes = () => ({
	statusCode: null,
	body: null,
	jsonBody: null,
	clearedCookie: null,
	sendStatusCode: null,
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
	clearCookie(name) {
		this.clearedCookie = name;
	},
	sendStatus(code) {
		this.sendStatusCode = code;
		return code;
	}
});

const createController = (overrides = {}) => {
	const flashCalls = [];
	const deps = {
		flashKeys,
		saveFlashAndRedirect: async (req, res, payload) => {
			flashCalls.push(payload);
			return payload;
		},
		deleteUserById: async () => {},
		updateUserProfileById: async () => {},
		...overrides
	};

	return { flashCalls, controller: createUserController(deps) };
};

test('updateProfile validiert fehlende Pflichtfelder', async () => {
	const { controller, flashCalls } = createController();

	await controller.updateProfile(createReq({ body: { firstName: 'Tony', lastName: '' } }), createRes());

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.profileFeedback,
		payload: {
			errorTitle: 'Bitte überprüfe deine Eingaben:',
			errors: ['Nachname'],
			values: {
				firstName: 'Tony',
				lastName: ''
			}
		},
		redirectTo: '/me/profile'
	});
});

test('updateProfile aktualisiert Namen und setzt Erfolgs-Flash', async () => {
	const updateCalls = [];
	const { controller, flashCalls } = createController({
		updateUserProfileById: async (...args) => {
			updateCalls.push(args);
		}
	});

	await controller.updateProfile(createReq({ body: { firstName: ' Tony ', lastName: ' Nguyen ' } }), createRes());

	assert.deepEqual(updateCalls, [[5, 'Tony', 'Nguyen']]);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.profileFeedback,
		payload: {
			successMessage: 'Profil wurde erfolgreich aktualisiert.',
			values: {
				firstName: 'Tony',
				lastName: 'Nguyen'
			}
		},
		redirectTo: '/me/profile'
	});
});
