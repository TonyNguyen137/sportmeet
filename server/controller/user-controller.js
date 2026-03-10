import { FLASH_KEYS, saveFlashAndRedirect } from '../utils/flash.js';
import { deleteUserById, updateUserProfileById } from '../model/user-model.js';

const defaultDeps = {
	flashKeys: FLASH_KEYS,
	saveFlashAndRedirect,
	deleteUserById,
	updateUserProfileById
};

export const createUserController = (deps = defaultDeps) => {
	const {
		flashKeys,
		saveFlashAndRedirect: saveFlashAndRedirectValue,
		deleteUserById: deleteUserByIdValue,
		updateUserProfileById: updateUserProfileByIdValue
	} = deps;

	const updateProfile = async (req, res) => {
		const userId = req.session?.userId;
		const firstName = String(req.body?.firstName || '').trim();
		const lastName = String(req.body?.lastName || '').trim();
		const values = { firstName, lastName };

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!firstName || !lastName) {
			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.profileFeedback,
				payload: {
					errorTitle: 'Bitte überprüfe deine Eingaben:',
					errors: [...(!firstName ? ['Vorname'] : []), ...(!lastName ? ['Nachname'] : [])],
					values
				},
				redirectTo: '/me/profile'
			});
		}

		try {
			await updateUserProfileByIdValue(userId, firstName, lastName);
			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.profileFeedback,
				payload: {
					successMessage: 'Profil wurde erfolgreich aktualisiert.',
					values
				},
				redirectTo: '/me/profile'
			});
		} catch (error) {
			console.error('Profile update failed:', error);
			return res.status(500).send('Ein interner Fehler ist aufgetreten.');
		}
	};

	const deleteAccount = async (req, res) => {
		const userId = req.session.userId;

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		try {
			await deleteUserByIdValue(userId);

			req.session.destroy((err) => {
				if (err) {
					console.error('Session destroy error:', err);
					return res.sendStatus(500);
				}
				res.clearCookie('sportmeet_sid');
				return res.sendStatus(200);
			});
		} catch (err) {
			console.error('Database error during deletion:', err);
			return res.status(500).json({ error: 'Datenbankfehler' });
		}
	};

	return {
		updateProfile,
		deleteAccount
	};
};

const userController = createUserController();

export const updateProfile = userController.updateProfile;
export const deleteAccount = userController.deleteAccount;
