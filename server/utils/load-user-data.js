import { findUserBasicById, findUserGroupsByUserId } from '../model/user-model.js';

export const loadUserData = async (req, res, next) => {
	if (req.session && req.session.userId) {
		try {
			const currentUser = await findUserBasicById(req.session.userId);
			const groups = await findUserGroupsByUserId(req.session.userId);
			const host = req.get('host');
			const origin = host ? `${req.protocol}://${host}` : '';
			const userGroups = groups.map((group) => ({
				...group,
				invite_link: `${origin}/groups/join?invite=${encodeURIComponent(group.invite_code)}`
			}));

			// Global verfügbar in allen EJS Templates
			res.locals.currentUser = currentUser;
			res.locals.userGroups = userGroups;
		} catch (err) {
			console.error('Fehler beim Laden der User-Daten:', err);
			res.locals.currentUser = null;
			res.locals.userGroups = [];
		}
	} else {
		res.locals.currentUser = null;
		res.locals.userGroups = [];
	}
	next();
};
