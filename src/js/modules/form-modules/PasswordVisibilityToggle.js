import { CLASS_HIDDEN } from '../../css-classes.js';

export class PasswordVisibilityToggle {
	constructor(form) {
		this.form = form;
		this.toggles = Array.from(
			form.querySelectorAll('[data-password-toggle], .btn--toggle-visibility')
		);

		if (this.toggles.length === 0) return;

		this.pairs = this.toggles
			.map((toggle) => {
				const group =
					toggle.closest('.focus-within\\:outline-accent-blue') || toggle.parentElement;
				const input = group?.querySelector(
					'[data-password-input], input[type="password"], input[type="text"]'
				);
				if (!input) return null;
				return {
					toggle,
					input,
					eyeOpen: toggle.querySelector('.eye'),
					eyeClosed: toggle.querySelector('.eye-off'),
					isVisible: input.type === 'text'
				};
			})
			.filter(Boolean);

		if (this.pairs.length === 0) return;

		this.init();
	}

	static isAvailable(form) {
		return (
			form.querySelector('[data-password-input], input[type="password"]') &&
			form.querySelector('[data-password-toggle], .btn--toggle-visibility')
		);
	}

	init() {
		this.pairs.forEach((pair) => {
			pair.toggle.addEventListener('click', this.handleToggle);
			this.updateIcon(pair);
		});
	}

	handleToggle = (e) => {
		const pair = this.pairs.find((item) => item.toggle === e.currentTarget);
		if (!pair) return;

		pair.isVisible = !pair.isVisible;
		pair.input.type = pair.isVisible ? 'text' : 'password';
		this.updateIcon(pair);
	};

	updateIcon(pair) {
		if (pair.eyeOpen && pair.eyeClosed) {
			pair.eyeOpen.classList.toggle(CLASS_HIDDEN, pair.isVisible);
			pair.eyeClosed.classList.toggle(CLASS_HIDDEN, !pair.isVisible);
		}
		pair.toggle.setAttribute(
			'aria-label',
			pair.isVisible ? 'Passwort verbergen' : 'Passwort anzeigen'
		);
	}

	destroy() {
		this.pairs.forEach((pair) => {
			pair.toggle.removeEventListener('click', this.handleToggle);
		});
	}
}
