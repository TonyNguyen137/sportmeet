import express from 'express';
import { formParser } from '../utils/auth.js';
import {
	getRegisterPage,
	getForgotPasswordPage,
	getPrivacyPage,
	getResetPasswordPage,
	register,
	login,
	forgotPassword,
	resetPassword,
	logout
} from '../controller/auth-controller.js';

export const createAuthRouter = (
	handlers = {
		formParser,
		getRegisterPage,
		getForgotPasswordPage,
		getPrivacyPage,
		getResetPasswordPage,
		register,
		login,
		forgotPassword,
		resetPassword,
		logout
	}
) => {
	const router = express.Router();

	router.get('/register', handlers.getRegisterPage);
	router.get('/forgot-password', handlers.getForgotPasswordPage);
	router.get('/privacy-policy', handlers.getPrivacyPage);
	router.get('/reset-password', handlers.getResetPasswordPage);
	router.post('/register', handlers.formParser, handlers.register);
	router.post('/login', handlers.formParser, handlers.login);
	router.post('/forgot-password', handlers.formParser, handlers.forgotPassword);
	router.post('/reset-password', handlers.formParser, handlers.resetPassword);
	router.post('/logout', handlers.logout);

	return router;
};

export default createAuthRouter();
