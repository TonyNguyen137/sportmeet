import { FLASH_KEYS, saveFlashAndRedirect } from '../utils/flash.js';
import { deleteUserById, updateUserProfileById } from '../model/user-model.js';

export const updateProfile = async (req, res) => {
	const userId = req.session?.userId;
	const firstName = String(req.body?.firstName || '').trim();
	const lastName = String(req.body?.lastName || '').trim();
	const values = { firstName, lastName };

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!firstName || !lastName) {
		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.profileFeedback,
			payload: {
				errorTitle: 'Bitte überprüfe deine Eingaben:',
				errors: [
					...(!firstName ? ['Vorname'] : []),
					...(!lastName ? ['Nachname'] : [])
				],
				values
			},
			redirectTo: '/me/profile'
		});
	}

	try {
		await updateUserProfileById(userId, firstName, lastName);
		return saveFlashAndRedirect(req, res, {
			key: FLASH_KEYS.profileFeedback,
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

export const deleteAccount = async (req, res) => {
	const userId = req.session.userId;

	if (!userId) {
		return res.status(401).json({ error: 'Nicht autorisiert' });
	}

	try {
		await deleteUserById(userId);

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
