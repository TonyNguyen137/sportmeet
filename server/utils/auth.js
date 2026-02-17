import express from 'express';

export const formParser = express.urlencoded({ extended: true });

// Prüfen ob eingeloggt
export const checkAuth = (req, res, next) => {
	// Check if the session exists and has a userId
	if (req.session && req.session.userId) {
		return next(); // Everything okay, proceed to /me
	} else {
		// Not logged in! Redirect to login page
		res.redirect('/');
	}
};
