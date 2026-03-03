import { deleteUserById } from '../model/user-model.js';

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
