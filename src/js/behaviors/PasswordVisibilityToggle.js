import { CLASS_HIDDEN } from '../css-classes.js';

export class PasswordVisibilityToggle {
	constructor(selector = '.btn--toggle-visibility') {
		this._buttons = Array.from(document.querySelectorAll(selector));
		if (!this._buttons.length) return;
		this._buttons.forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const container = btn.closest('div');
				const input =
					container &&
					container.querySelector('input[type="password"], input[type="text"]');
				if (!input) return;
				const willShow = input.type === 'password';
				input.type = willShow ? 'text' : 'password';
				const eye = btn.querySelector('.eye');
				const eyeOff = btn.querySelector('.eye-off');
				const isVisible = input.type === 'text';
				if (eye) eye.classList.toggle(CLASS_HIDDEN, isVisible);
				if (eyeOff) eyeOff.classList.toggle(CLASS_HIDDEN, !isVisible);
				btn.setAttribute(
					'aria-label',
					isVisible ? 'Passwort verbergen' : 'Passwort anzeigen'
				);
			});
		});
	}
}
