import pool from './db.js';

export const findUserIdByEmail = async (email) => {
	const result = await pool.query(
		'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
		[email]
	);
	return result.rows[0] || null;
};

export const replacePasswordResetToken = async (userId, tokenHash, expiresAt) => {
	await pool.query(
		'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()',
		[userId]
	);
	await pool.query(
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		[userId, tokenHash, expiresAt]
	);
};

export const findValidPasswordResetToken = async (tokenHash) => {
	const result = await pool.query(
		`SELECT id, user_id
		 FROM password_reset_tokens
		 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
		 LIMIT 1`,
		[tokenHash]
	);
	return result.rows[0] || null;
};

export const findUserPasswordHashById = async (userId) => {
	const result = await pool.query(
		'SELECT password_hash FROM users WHERE id = $1 LIMIT 1',
		[userId]
	);
	return result.rows[0]?.password_hash || null;
};

export const updatePasswordByResetToken = async (userId, tokenId, hashedPassword) => {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
			hashedPassword,
			userId
		]);
		await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [
			tokenId
		]);
		await client.query(
			'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2',
			[userId, tokenId]
		);
		await client.query('COMMIT');
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const createUser = async ({ firstName, lastName, email, passwordHash }) => {
	await pool.query(
		`INSERT INTO users (first_name, last_name, email, password_hash)
		 VALUES ($1, $2, $3, $4)`,
		[firstName, lastName, email, passwordHash]
	);
};

export const findUserForLogin = async (email) => {
	const result = await pool.query(
		'SELECT id, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
		[email]
	);
	return result.rows[0] || null;
};
