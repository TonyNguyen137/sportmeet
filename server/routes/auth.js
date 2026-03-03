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

const router = express.Router();

router.get('/register', getRegisterPage);
router.get('/forgot-password', getForgotPasswordPage);
router.get('/privacy-policy', getPrivacyPage);
router.get('/reset-password', getResetPasswordPage);
router.post('/register', formParser, register);
router.post('/login', formParser, login);
router.post('/forgot-password', formParser, forgotPassword);
router.post('/reset-password', formParser, resetPassword);
router.post('/logout', logout);

export default router;
