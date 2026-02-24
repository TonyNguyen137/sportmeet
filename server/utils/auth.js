import express from 'express';

export const formParser = express.urlencoded({ extended: true });

export const checkAuth = (req, res, next) => {
	if (req.session && req.session.userId) {
		// proceed to /me
		return next();
	} else {
		res.redirect('/');
	}
};
