import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthController } from '../../../server/controller/auth-controller.js';

const flashKeys = {
	loginFeedback: 'loginFeedback',
	registerFeedback: 'registerFeedback',
	registerSuccess: 'registerSuccess',
	authSuccess: 'authSuccess',
	forgotPasswordFeedback: 'forgotPasswordFeedback',
	resetPasswordFeedback: 'resetPasswordFeedback',
	toast: 'toast',
	eventFormFeedback: 'eventFormFeedback'
};

const createReq = ({ body = {}, query = {}, session = {}, protocol = 'https', host } = {}) => ({
	body,
	query,
	session: {
		save(callback) {
			callback(null);
		},
		destroy(callback) {
			callback(null);
		},
		...session
	},
	protocol,
	get(name) {
		return name === 'host' ? host || 'sportmeet.test' : undefined;
	}
});

const createRes = () => ({
	statusCode: null,
	redirectPath: null,
	body: null,
	jsonBody: null,
	rendered: null,
	clearedCookie: null,
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
	redirect(path) {
		this.redirectPath = path;
		return path;
	},
	render(view, payload) {
		this.rendered = { view, payload };
		return this.rendered;
	},
	clearCookie(name) {
		this.clearedCookie = name;
	}
});

const createController = (overrides = {}) => {
	const flashCalls = [];
	const deps = {
		bcrypt: {
			hash: async (value) => `hashed:${value}`,
			compare: async () => false
		},
		config: { appBaseUrl: 'https://app.sportmeet.test/' },
		consumeFlash: () => ({}),
		flashKeys,
		saveFlashAndRedirect: async (req, res, payload) => {
			flashCalls.push(payload);
			return payload;
		},
		getPasswordRequirementErrors: () => [],
		isValidEmail: () => true,
		sendMail: async () => {},
		createUser: async () => {},
		findUserForLogin: async () => null,
		findUserIdByEmail: async () => null,
		findUserPasswordHashById: async () => null,
		findValidPasswordResetToken: async () => null,
		replacePasswordResetToken: async () => {},
		updatePasswordByResetToken: async () => {},
		createResetToken: () => ({ token: 'plain-token', tokenHash: 'hashed-token' }),
		hashToken: (value) => `sha256:${value}`,
		...overrides
	};

	return { flashCalls, controller: createAuthController(deps) };
};

test('register validiert fehlende Pflichtfelder und sendet Register-Feedback', async () => {
	const { controller, flashCalls } = createController();
	const req = createReq({ body: { firstName: 'Tony' } });

	await controller.register(req, createRes());

	assert.equal(flashCalls.length, 1);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.registerFeedback,
		payload: {
			errorTitle: 'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:',
			errors: ['Nachname', 'E-Mail-Adresse', 'Passwort', 'Passwort-Bestätigung'],
			values: { firstName: 'Tony', lastName: '', email: '' }
		},
		redirectTo: '/register'
	});
});

test('register erstellt Nutzer und setzt Erfolgs-Flash', async () => {
	const calls = [];
	const { controller, flashCalls } = createController({
		createUser: async (payload) => {
			calls.push(payload);
		}
	});
	const req = createReq({
		body: {
			firstName: 'Tony',
			lastName: 'Nguyen',
			email: 'tony@example.com',
			password: 'Abcdefg1',
			passwordConfirm: 'Abcdefg1'
		}
	});

	await controller.register(req, createRes());

	assert.deepEqual(calls, [
		{
			firstName: 'Tony',
			lastName: 'Nguyen',
			email: 'tony@example.com',
			passwordHash: 'hashed:Abcdefg1'
		}
	]);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.authSuccess,
		payload: {
			message: 'Konto erfolgreich erstellt. Bitte anmelden.',
			values: { email: 'tony@example.com' }
		},
		redirectTo: '/'
	});
});

test('register behandelt doppelte E-Mail sauber', async () => {
	const { controller, flashCalls } = createController({
		createUser: async () => {
			const error = new Error('duplicate');
			error.code = '23505';
			throw error;
		}
	});
	const req = createReq({
		body: {
			firstName: 'Tony',
			lastName: 'Nguyen',
			email: 'tony@example.com',
			password: 'Abcdefg1',
			passwordConfirm: 'Abcdefg1'
		}
	});

	await controller.register(req, createRes());

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.registerFeedback,
		payload: {
			errorTitle: 'Registrierung fehlgeschlagen:',
			errors: ['Diese E-Mail-Adresse wird bereits verwendet.'],
			values: { firstName: 'Tony', lastName: 'Nguyen', email: 'tony@example.com' }
		},
		redirectTo: '/register'
	});
});

test('login validiert Eingaben vor Datenbankzugriff', async () => {
	const { controller, flashCalls } = createController({
		isValidEmail: () => false
	});
	const req = createReq({ body: { email: 'invalid', password: 'secret' } });

	await controller.login(req, createRes());

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.loginFeedback,
		payload: {
			errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
			errors: ['Gültige E-Mail-Adresse'],
			values: { email: 'invalid' }
		},
		redirectTo: '/'
	});
});

test('login speichert userId in Session und leitet auf /me weiter', async () => {
	const { controller } = createController({
		findUserForLogin: async () => ({ id: 42, password_hash: 'stored-hash' }),
		bcrypt: {
			hash: async (value) => `hashed:${value}`,
			compare: async () => true
		}
	});
	const req = createReq({
		body: { email: 'tony@example.com', password: 'Abcdefg1' }
	});
	const res = createRes();

	await controller.login(req, res);

	assert.equal(req.session.userId, 42);
	assert.equal(res.redirectPath, '/me');
});

test('forgotPassword gibt generische Erfolgsmeldung ohne vorhandenen User', async () => {
	const { controller, flashCalls } = createController();
	const req = createReq({ body: { email: 'tony@example.com' } });

	await controller.forgotPassword(req, createRes());

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.forgotPasswordFeedback,
		payload: {
			errorTitle: '',
			errors: [],
			successMessage:
				'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen gesendet.',
			values: {}
		},
		redirectTo: '/forgot-password'
	});
});

test('forgotPassword ersetzt Reset-Token und versendet E-Mail bei vorhandenem User', async () => {
	const replaceCalls = [];
	const mailCalls = [];
	const { controller } = createController({
		findUserIdByEmail: async () => ({ id: 9 }),
		replacePasswordResetToken: async (...args) => {
			replaceCalls.push(args);
		},
		sendMail: async (payload) => {
			mailCalls.push(payload);
		}
	});
	const req = createReq({ body: { email: 'tony@example.com' } });

	await controller.forgotPassword(req, createRes());

	assert.equal(replaceCalls.length, 1);
	assert.equal(replaceCalls[0][0], 9);
	assert.equal(replaceCalls[0][1], 'hashed-token');
	assert.ok(replaceCalls[0][2] instanceof Date);
	assert.equal(mailCalls.length, 1);
	assert.equal(mailCalls[0].to, 'tony@example.com');
	assert.match(mailCalls[0].html, /https:\/\/app\.sportmeet\.test\/reset-password\?token=plain-token/);
});

test('getResetPasswordPage rendert Formular bei gueltigem Token', async () => {
	const { controller } = createController({
		consumeFlash: () => ({
			errorTitle: 'Hinweis',
			errors: ['A'],
			successMessage: 'B',
			values: { extra: 'x' }
		}),
		findValidPasswordResetToken: async (hash) =>
			hash === 'sha256:plain-token' ? { id: 1, user_id: 2 } : null
	});
	const res = createRes();

	await controller.getResetPasswordPage(
		createReq({ query: { token: 'plain-token' } }),
		res
	);

	assert.deepEqual(res.rendered, {
		view: 'base',
		payload: {
			title: 'SportMeet Passwort neu setzen',
			template: 'page-reset-password',
			resetErrorTitle: 'Hinweis',
			resetErrors: ['A'],
			resetSuccessMessage: 'B',
			resetValues: { token: 'plain-token', extra: 'x' },
			resetTokenError: '',
			resetTokenValid: true
		}
	});
});

test('resetPassword validiert Passwort-Anforderungen vor Datenbankzugriff', async () => {
	const { controller, flashCalls } = createController({
		getPasswordRequirementErrors: () => ['Mindestens 8 Zeichen']
	});

	await controller.resetPassword(
		createReq({
			body: { token: 'plain-token', password: 'short', passwordConfirm: 'short' }
		}),
		createRes()
	);

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.resetPasswordFeedback,
		payload: {
			errorTitle: 'Passwort-Anforderungen nicht erfüllt:',
			errors: ['Mindestens 8 Zeichen'],
			successMessage: '',
			values: { token: 'plain-token' }
		},
		redirectTo: '/reset-password?token=plain-token'
	});
});

test('resetPassword aktualisiert Passwort und setzt Erfolgs-Flash', async () => {
	const updateCalls = [];
	const { controller, flashCalls } = createController({
		findValidPasswordResetToken: async () => ({ id: 7, user_id: 11 }),
		findUserPasswordHashById: async () => 'old-hash',
		bcrypt: {
			compare: async () => false,
			hash: async (value) => `new-hash:${value}`
		},
		updatePasswordByResetToken: async (...args) => {
			updateCalls.push(args);
		}
	});

	await controller.resetPassword(
		createReq({
			body: {
				token: 'plain-token',
				password: 'Abcdefg1',
				passwordConfirm: 'Abcdefg1'
			}
		}),
		createRes()
	);

	assert.deepEqual(updateCalls, [[11, 7, 'new-hash:Abcdefg1']]);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.authSuccess,
		payload: {
			message: 'Passwort erfolgreich aktualisiert. Bitte anmelden.'
		},
		redirectTo: '/'
	});
});

test('logout entfernt Cookie und liefert JSON-Erfolg', () => {
	const { controller } = createController();
	const res = createRes();

	controller.logout(createReq(), res);

	assert.equal(res.clearedCookie, 'sportmeet_sid');
	assert.equal(res.statusCode, 200);
	assert.deepEqual(res.jsonBody, { message: 'Erfolgreich abgemeldet' });
});
