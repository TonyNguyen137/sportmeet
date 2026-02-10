import express from 'express';
const router = express.Router();

// GET /register -> Zeigt das Formular an
router.get('/register', (req, res) => {
	res.render('base', {
		title: 'SportMeet Registrierung',
		template: 'page-register'
	});
});

// Route: POST /register
router.post('/register', (req, res) => {
	const { username, email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: 'Daten unvollständig' });
	}

	res.status(201).json({
		message: 'User erfolgreich registriert',
		user: username
	});
});

export default router;
