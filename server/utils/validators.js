export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;

export const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim());

export const getPasswordRequirementErrors = (value) => {
	const password = String(value || '');
	const errors = [];

	if (password.length < PASSWORD_MIN_LENGTH) {
		errors.push('Mindestens 8 Zeichen');
	}
	if (!/[A-Z]/.test(password)) {
		errors.push('Einen Großbuchstaben');
	}
	if (!/\d/.test(password)) {
		errors.push('Eine Zahl');
	}

	return errors;
};
