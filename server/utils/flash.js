export const FLASH_KEYS = {
	loginFeedback: 'loginFeedback',
	registerFeedback: 'registerFeedback',
	registerSuccess: 'registerSuccess',
	authSuccess: 'authSuccess',
	forgotPasswordFeedback: 'forgotPasswordFeedback',
	resetPasswordFeedback: 'resetPasswordFeedback',
	toast: 'toast',
	eventFormFeedback: 'eventFormFeedback'
};

export const saveFlashAndRedirect = (req, res, { key, payload, redirectTo = '/' }) => {
	req.session[key] = payload;
	return req.session.save((err) => {
		if (err) {
			console.error('Session save error:', err);
			return res.status(500).send('Internal Server Error');
		}
		return res.redirect(redirectTo);
	});
};

export const consumeFlash = (req, key, fallback = {}) => {
	const value = req.session?.[key] || fallback;
	if (req.session?.[key]) {
		delete req.session[key];
	}
	return value;
};
