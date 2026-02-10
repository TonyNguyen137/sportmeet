import express from 'express';
const router = express.Router();

import { formParser } from '../utils/auth.js';

// GET /register -> Zeigt das Formular an
router.get('/register', (req, res) => {
	res.render('base', {
		title: 'SportMeet Registrierung',
		template: 'page-register'
	});
});

// Route: POST /register
router.post('/register', formParser, (req, res) => {
	console.log('body', req.body);

	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: 'Daten unvollständig' });
	}

	res.status(201).json({
		message: 'User erfolgreich registriert',
		email: email
	});
});

export default router;
