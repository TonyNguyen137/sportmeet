export class PasswordStrengthIndicator {
	constructor(form) {
		this.form = form;
		this.input = form.querySelector('[data-password-input]');
		this.container = form.querySelector('[data-strength-container]');

		if (!this.input || !this.container) return;

		this.strengthLabel = this.container.querySelector('[data-strength-label]');
		this.bars = this.container.querySelectorAll('[data-strength-bar]');

		this.init();
	}

	static isAvailable(form) {
		return form.querySelector('[data-password-input]') && form.querySelector('[data-strength-container]');
	}

	init() {
		this.input.addEventListener('input', this.handleInput);
	}

	handleInput = () => {
		this.updateStrength();
	};

	getStrength(password) {
		if (!password) return { strength: 0, label: '', color: '' };

		let strength = 0;
		if (password.length >= 8) strength++;
		if (password.length >= 12) strength++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
		if (/\d/.test(password)) strength++;
		if (/[^a-zA-Z0-9]/.test(password)) strength++;

		if (strength <= 2) return { strength, label: 'Schwach', color: 'red' };
		if (strength === 3) return { strength, label: 'Mittel', color: 'yellow' };
		if (strength === 4) return { strength, label: 'Gut', color: 'blue' };
		return { strength, label: 'Sehr sicher', color: 'green' };
	}

	updateStrength() {
		const strength = this.getStrength(this.input.value);

		if (!this.input.value) {
			this.container.classList.add('hidden');
			return;
		}

		this.container.classList.remove('hidden');
		this.strengthLabel.textContent = strength.label;

		this.bars.forEach((bar, index) => {
			if (index < strength.strength) {
				bar.className = `h-2 flex-1 rounded-full transition-colors bg-${strength.color}-500`;
			} else {
				bar.className = 'h-2 flex-1 rounded-full transition-colors bg-gray-200';
			}
		});
	}

	destroy() {
		this.input.removeEventListener('input', this.handleInput);
	}
}
