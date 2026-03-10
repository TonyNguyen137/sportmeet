import { findUserBasicById, findUserGroupsByUserId } from '../model/user-model.js';

export const createLoadUserData = (deps = { findUserBasicById, findUserGroupsByUserId }) => {
	const { findUserBasicById: findUserBasicByIdValue, findUserGroupsByUserId: findUserGroupsByUserIdValue } = deps;

	return async (req, res, next) => {
		if (req.session && req.session.userId) {
			try {
				const currentUser = await findUserBasicByIdValue(req.session.userId);
				const groups = await findUserGroupsByUserIdValue(req.session.userId);
				const host = req.get('host');
				const origin = host ? `${req.protocol}://${host}` : '';
				const userGroups = groups.map((group) => ({
					...group,
					invite_link: `${origin}/groups/join?invite=${encodeURIComponent(group.invite_code)}`
				}));

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
};

export const loadUserData = createLoadUserData();
