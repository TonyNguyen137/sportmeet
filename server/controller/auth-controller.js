import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import config from '../config.js';
import { consumeFlash, FLASH_KEYS, saveFlashAndRedirect } from '../utils/flash.js';
import { getPasswordRequirementErrors, isValidEmail } from '../utils/validators.js';
import { sendMail } from '../utils/mailer.js';
import {
	createUser,
	findUserForLogin,
	findUserIdByEmail,
	findUserPasswordHashById,
	findValidPasswordResetToken,
	replacePasswordResetToken,
	updatePasswordByResetToken
} from '../model/auth-model.js';

const PASSWORD_RESET_TTL_MINUTES = 5;

const defaultDeps = {
	bcrypt,
	config,
	consumeFlash,
	flashKeys: FLASH_KEYS,
	saveFlashAndRedirect,
	getPasswordRequirementErrors,
	isValidEmail,
	sendMail,
	createUser,
	findUserForLogin,
	findUserIdByEmail,
	findUserPasswordHashById,
	findValidPasswordResetToken,
	replacePasswordResetToken,
	updatePasswordByResetToken,
	createResetToken: () => {
		const token = crypto.randomBytes(32).toString('hex');
		const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
		return { token, tokenHash };
	},
	hashToken: (value) => crypto.createHash('sha256').update(value).digest('hex')
};

export const createAuthController = (deps = defaultDeps) => {
	const {
		bcrypt: bcryptLib,
		config: appConfig,
		consumeFlash: consumeFlashValue,
		flashKeys,
		saveFlashAndRedirect: saveFlashAndRedirectValue,
		getPasswordRequirementErrors: getPasswordRequirementErrorsValue,
		isValidEmail: isValidEmailValue,
		sendMail: sendMailValue,
		createUser: createUserValue,
		findUserForLogin: findUserForLoginValue,
		findUserIdByEmail: findUserIdByEmailValue,
		findUserPasswordHashById: findUserPasswordHashByIdValue,
		findValidPasswordResetToken: findValidPasswordResetTokenValue,
		replacePasswordResetToken: replacePasswordResetTokenValue,
		updatePasswordByResetToken: updatePasswordByResetTokenValue,
		createResetToken,
		hashToken
	} = deps;

	const redirectToLoginWithFeedback = (
		req,
		res,
		{ errorTitle = 'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:', errors = [], values = {} } = {}
	) =>
		saveFlashAndRedirectValue(req, res, {
			key: flashKeys.loginFeedback,
			payload: { errorTitle, errors, values },
			redirectTo: '/'
		});

	const redirectToRegisterWithFeedback = (
		req,
		res,
		{ errorTitle = 'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:', errors = [], values = {} } = {}
	) =>
		saveFlashAndRedirectValue(req, res, {
			key: flashKeys.registerFeedback,
			payload: { errorTitle, errors, values },
			redirectTo: '/register'
		});

	const redirectToForgotPasswordWithFeedback = (
		req,
		res,
		{ errorTitle = '', errors = [], successMessage = '', values = {} } = {}
	) =>
		saveFlashAndRedirectValue(req, res, {
			key: flashKeys.forgotPasswordFeedback,
			payload: { errorTitle, errors, successMessage, values },
			redirectTo: '/forgot-password'
		});

	const redirectToResetPasswordWithFeedback = (
		req,
		res,
		{ errorTitle = '', errors = [], successMessage = '', values = {} } = {}
	) =>
		saveFlashAndRedirectValue(req, res, {
			key: flashKeys.resetPasswordFeedback,
			payload: { errorTitle, errors, successMessage, values },
			redirectTo: `/reset-password?token=${encodeURIComponent(values.token || '')}`
		});

	const getAppBaseUrl = (req) => (appConfig.appBaseUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

	const getRegisterPage = (req, res) => {
		const registerFeedback = consumeFlashValue(req, flashKeys.registerFeedback, {});

		res.render('base', {
			title: 'SportMeet Registrierung',
			template: 'page-register',
			loginErrorTitle: registerFeedback.errorTitle || 'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:',
			loginErrors: registerFeedback.errors || [],
			loginValues: registerFeedback.values || {}
		});
	};

	const getForgotPasswordPage = (req, res) => {
		const forgotFeedback = consumeFlashValue(req, flashKeys.forgotPasswordFeedback, {});

		return res.render('base', {
			title: 'SportMeet Passwort vergessen',
			template: 'page-forgot-password',
			forgotErrorTitle: forgotFeedback.errorTitle || '',
			forgotErrors: forgotFeedback.errors || [],
			forgotSuccessMessage: forgotFeedback.successMessage || '',
			forgotValues: forgotFeedback.values || {}
		});
	};

	const getPrivacyPage = (req, res) => {
		return res.render('base', {
			title: 'SportMeet Datenschutzerklärung',
			template: 'page-privacy-policy'
		});
	};

	const forgotPassword = async (req, res) => {
		const email = String(req.body?.email || '').trim();
		const values = { email };

		if (!email) {
			return redirectToForgotPasswordWithFeedback(req, res, {
				errorTitle: 'Fehlende Angaben:',
				errors: ['E-Mail-Adresse'],
				values
			});
		}

		if (!isValidEmailValue(email)) {
			return redirectToForgotPasswordWithFeedback(req, res, {
				errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
				errors: ['Gültige E-Mail-Adresse'],
				values
			});
		}

		const genericSuccessMessage =
			'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen gesendet.';

		try {
			const user = await findUserIdByEmailValue(email);

			if (user) {
				const { token, tokenHash } = createResetToken();
				const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

				await replacePasswordResetTokenValue(user.id, tokenHash, expiresAt);

				const resetLink = `${getAppBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
				const expiresInMinutes = PASSWORD_RESET_TTL_MINUTES;

				await sendMailValue({
					to: email,
					subject: 'SportMeet Passwort zurücksetzen',
					html: `
					<p>Hallo,</p>
					<p>du hast ein Zurücksetzen deines Passworts angefordert.</p>
					<p>
						<a href="${resetLink}">Passwort jetzt zurücksetzen</a>
					</p>
					<p>Der Link ist ${expiresInMinutes} Minuten gültig.</p>
					<p>Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
				`
				});
			}

			return redirectToForgotPasswordWithFeedback(req, res, {
				successMessage: genericSuccessMessage
			});
		} catch (err) {
			console.error('Passwort-reset Anforderung fehlgeschlagen:', err);
			return res.status(500).send('Ein interner Fehler ist aufgetreten.');
		}
	};

	const getResetPasswordPage = async (req, res) => {
		const token = String(req.query?.token || '').trim();
		const resetFeedback = consumeFlashValue(req, flashKeys.resetPasswordFeedback, {});

		if (!token) {
			return redirectToForgotPasswordWithFeedback(req, res, {
				errorTitle: 'Passwort-zurücksetzen fehlgeschlagen:',
				errors: ['Der Link ist ungültig oder unvollständig.']
			});
		}

		try {
			const tokenHash = hashToken(token);
			const resetToken = await findValidPasswordResetTokenValue(tokenHash);
			if (!resetToken) {
				return redirectToForgotPasswordWithFeedback(req, res, {
					errorTitle: 'Passwort-zurücksetzen fehlgeschlagen:',
					errors: ['Der Link ist ungültig oder bereits abgelaufen.']
				});
			}
		} catch (err) {
			console.error('Fehler beim Laden der Reset-Seite:', err);
			return res.status(500).send('Ein interner Fehler ist aufgetreten.');
		}

		return res.render('base', {
			title: 'SportMeet Passwort neu setzen',
			template: 'page-reset-password',
			resetErrorTitle: resetFeedback.errorTitle || '',
			resetErrors: resetFeedback.errors || [],
			resetSuccessMessage: resetFeedback.successMessage || '',
			resetValues: { token, ...(resetFeedback.values || {}) },
			resetTokenError: '',
			resetTokenValid: true
		});
	};

	const resetPassword = async (req, res) => {
		const token = String(req.body?.token || '').trim();
		const password = String(req.body?.password || '');
		const passwordConfirm = String(req.body?.passwordConfirm || '');
		const values = { token };

		if (!token) {
			return redirectToForgotPasswordWithFeedback(req, res, {
				errorTitle: 'Passwort-zurücksetzen fehlgeschlagen:',
				errors: ['Der Link ist ungültig oder unvollständig.']
			});
		}

		if (!password || !passwordConfirm) {
			return redirectToResetPasswordWithFeedback(req, res, {
				errorTitle: 'Fehlende Angaben:',
				errors: ['Passwort', 'Passwort-Bestätigung'],
				values
			});
		}

		if (password !== passwordConfirm) {
			return redirectToResetPasswordWithFeedback(req, res, {
				errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
				errors: ['Passwörter stimmen nicht überein.'],
				values
			});
		}

		const passwordRequirementErrors = getPasswordRequirementErrorsValue(password);
		if (passwordRequirementErrors.length > 0) {
			return redirectToResetPasswordWithFeedback(req, res, {
				errorTitle: 'Passwort-Anforderungen nicht erfüllt:',
				errors: passwordRequirementErrors,
				values
			});
		}

		try {
			const tokenHash = hashToken(token);
			const resetTokenRow = await findValidPasswordResetTokenValue(tokenHash);

			if (!resetTokenRow) {
				return redirectToForgotPasswordWithFeedback(req, res, {
					errorTitle: 'Passwort-zurücksetzen fehlgeschlagen:',
					errors: ['Der Link ist ungültig oder bereits abgelaufen.']
				});
			}

			const currentPasswordHash = await findUserPasswordHashByIdValue(resetTokenRow.user_id);

			if (!currentPasswordHash) {
				return redirectToForgotPasswordWithFeedback(req, res, {
					errorTitle: 'Passwort-zurücksetzen fehlgeschlagen:',
					errors: ['Das zugehörige Benutzerkonto wurde nicht gefunden.']
				});
			}

			const isSamePassword = await bcryptLib.compare(password, currentPasswordHash);
			if (isSamePassword) {
				return redirectToResetPasswordWithFeedback(req, res, {
					errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
					errors: ['Neues Passwort muss sich vom aktuellen Passwort unterscheiden.'],
					values
				});
			}

			const hashedPassword = await bcryptLib.hash(password, 10);
			await updatePasswordByResetTokenValue(resetTokenRow.user_id, resetTokenRow.id, hashedPassword);

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.authSuccess,
				payload: {
					message: 'Passwort erfolgreich aktualisiert. Bitte anmelden.'
				},
				redirectTo: '/'
			});
		} catch (err) {
			console.error('Passwort-zurücksetzen fehlgeschlagen:', err);
			return res.status(500).send('Ein interner Fehler ist aufgetreten.');
		}
	};

	const register = async (req, res) => {
		const firstName = String(req.body?.firstName || '').trim();
		const lastName = String(req.body?.lastName || '').trim();
		const email = String(req.body?.email || '').trim();
		const password = String(req.body?.password || '');
		const passwordConfirm = String(req.body?.passwordConfirm || '');
		const values = { firstName, lastName, email };
		const missingFields = [];

		if (!firstName) missingFields.push('Vorname');
		if (!lastName) missingFields.push('Nachname');
		if (!email) missingFields.push('E-Mail-Adresse');
		if (!password) missingFields.push('Passwort');
		if (!passwordConfirm) missingFields.push('Passwort-Bestätigung');

		if (missingFields.length > 0) {
			return redirectToRegisterWithFeedback(req, res, {
				errors: missingFields,
				values
			});
		}

		if (!isValidEmailValue(email)) {
			return redirectToRegisterWithFeedback(req, res, {
				errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
				errors: ['Gültige E-Mail-Adresse'],
				values
			});
		}

		if (password !== passwordConfirm) {
			return redirectToRegisterWithFeedback(req, res, {
				errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
				errors: ['Passwörter stimmen nicht überein.'],
				values
			});
		}

		const passwordRequirementErrors = getPasswordRequirementErrorsValue(password);
		if (passwordRequirementErrors.length > 0) {
			return redirectToRegisterWithFeedback(req, res, {
				errorTitle: 'Passwort-Anforderungen nicht erfüllt:',
				errors: passwordRequirementErrors,
				values
			});
		}

		try {
			const saltRounds = 10;
			const hashedPassword = await bcryptLib.hash(password, saltRounds);
			await createUserValue({
				firstName,
				lastName,
				email,
				passwordHash: hashedPassword
			});

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.authSuccess,
				payload: {
					message: 'Konto erfolgreich erstellt. Bitte anmelden.',
					values: { email }
				},
				redirectTo: '/'
			});
		} catch (err) {
			if (err.code === '23505') {
				return redirectToRegisterWithFeedback(req, res, {
					errorTitle: 'Registrierung fehlgeschlagen:',
					errors: ['Diese E-Mail-Adresse wird bereits verwendet.'],
					values
				});
			}
			console.error('Registrierungsfehler:', err);
			return res.status(500).send('Ein interner Fehler ist aufgetreten.');
		}
	};

	const login = async (req, res) => {
		const email = String(req.body?.email || '').trim();
		const password = String(req.body?.password || '');
		const missingFields = [];

		if (!email) missingFields.push('E-Mail-Adresse');
		if (!password) missingFields.push('Passwort');

		if (missingFields.length > 0) {
			return redirectToLoginWithFeedback(req, res, {
				errors: missingFields,
				values: { email }
			});
		}

		if (!isValidEmailValue(email)) {
			return redirectToLoginWithFeedback(req, res, {
				errorTitle: 'Bitte überprüfen Sie Ihre Eingaben:',
				errors: ['Gültige E-Mail-Adresse'],
				values: { email }
			});
		}

		try {
			const user = await findUserForLoginValue(email);
			const match = user ? await bcryptLib.compare(password, user.password_hash) : false;

			if (match) {
				req.session.userId = user.id;

				return req.session.save((err) => {
					if (err) {
						console.error('Session save error:', err);
						return res.status(500).send('Internal Server Error');
					}
					return res.redirect('/me');
				});
			}

			return redirectToLoginWithFeedback(req, res, {
				errorTitle: 'Anmeldung fehlgeschlagen:',
				errors: ['E-Mail oder Passwort falsch.'],
				values: { email }
			});
		} catch (err) {
			console.error('Login-Fehler:', err);
			return res.status(500).send('Server Fehler');
		}
	};

	const logout = (req, res) => {
		req.session.destroy((err) => {
			if (err) {
				console.error('Logout Fehler:', err);
				return res.status(500).json({ message: 'Fehler beim Abmelden' });
			}

			res.clearCookie('sportmeet_sid');
			return res.status(200).json({ message: 'Erfolgreich abgemeldet' });
		});
	};

	return {
		getRegisterPage,
		getForgotPasswordPage,
		getPrivacyPage,
		forgotPassword,
		getResetPasswordPage,
		resetPassword,
		register,
		login,
		logout
	};
};

export const {
	getRegisterPage,
	getForgotPasswordPage,
	getPrivacyPage,
	forgotPassword,
	getResetPasswordPage,
	resetPassword,
	register,
	login,
	logout
} = createAuthController();
