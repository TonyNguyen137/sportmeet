export class PasswordRequirements {
	constructor(form) {
		this.form = form;
		this.input =
			form.querySelector('[data-password-input]') ||
			form.querySelector('input[type="password"]');
		this.container = form.querySelector('[data-requirements-container]');

		if (!this.input || !this.container) return;

		this.requirements = {
			length: this.container.querySelector('[data-requirement-8chars]'),
			uppercase: this.container.querySelector('[data-requirement-uppercase]'),
			number: this.container.querySelector('[data-requirement-number]')
		};

		this.init();
	}

	static isAvailable(form) {
		return (
			(form.querySelector('[data-password-input]') ||
				form.querySelector('input[type="password"]')) &&
			form.querySelector('[data-requirements-container]')
		);
	}

	init() {
		this.input.addEventListener('input', this.handleInput);
	}

	handleInput = () => {
		this.updateRequirements();
	};

	updateRequirements() {
		const password = this.input.value;

		this.updateRequirement(this.requirements.length, password.length >= 8);
		this.updateRequirement(this.requirements.uppercase, /[A-Z]/.test(password));
		this.updateRequirement(this.requirements.number, /\d/.test(password));
	}

	updateRequirement(element, isMet) {
		if (!element) return;
		const icon = element.querySelector('[data-requirement-icon]');

		if (isMet) {
			element.classList.add('text-green-600');
			element.classList.remove('text-gray-600');
			icon?.classList.add('bg-green-100');
			icon?.classList.remove('bg-gray-100');
			if (icon) icon.textContent = '✓';
		} else {
			element.classList.remove('text-green-600');
			element.classList.add('text-gray-600');
			icon?.classList.remove('bg-green-100');
			icon?.classList.add('bg-gray-100');
			if (icon) icon.textContent = '○';
		}
	}

	destroy() {
		this.input.removeEventListener('input', this.handleInput);
	}
}
