import { CLASS_HIDDEN } from '../../css-classes.js';

export class FormValidation {
	constructor(form, options = {}) {
		this.form = form;
		this.options = {
			errorContainerSelector: '[data-error-container]',
			errorListSelector: '[data-error-list]',
			errorTitleSelector: '[data-error-title]',
			defaultErrorTitle: 'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:',
			requiredSelector: '[required]',
			invalidInputClass: 'outline-red-400',
			...options
		};
		this.errorContainer = this.form.querySelector(this.options.errorContainerSelector);
		this.errorList = this.errorContainer?.querySelector(this.options.errorListSelector);
		this.errorTitle = this.errorContainer?.querySelector(this.options.errorTitleSelector);
		this.fields = [];

		if (this.getRequiredFields().length === 0) return;

		this.init();
	}

	static isAvailable(form) {
		return !!form?.querySelector('[required]');
	}

	init() {
		this.form.setAttribute('novalidate', '');
		this.form.addEventListener('submit', this.handleSubmit);
		this.focusServerErrors();
	}

	focusServerErrors() {
		const hasVisibleErrorContainer = this.errorContainer && !this.errorContainer.classList.contains(CLASS_HIDDEN);
		const hasErrorItems = this.errorList && this.errorList.children.length > 0;

		if (hasVisibleErrorContainer && hasErrorItems) {
			this.focusErrorContainer();
		}
	}

	handleSubmit = (e) => {
		const errors = this.validate();

		if (errors.length === 0) return;

		e.preventDefault();
		this.updateErrorSummary(errors, true);
	};

	validate() {
		this.fields = this.getRequiredFields();
		this.fields.forEach((field) => this.validateField(field));
		return this.collectErrors();
	}

	getRequiredFields() {
		return Array.from(this.form.querySelectorAll(this.options.requiredSelector));
	}

	validateField(field) {
		const message = this.getFieldError(field);

		field.dataset.errorMessage = message || '';

		if (message) {
			field.classList.add(this.options.invalidInputClass);
		} else {
			field.classList.remove(this.options.invalidInputClass);
		}
	}

	getFieldError(field) {
		const value = field.value.trim();

		if (!value) {
			return this.getFieldLabel(field);
		}

		if (field.type === 'email' && !field.checkValidity()) {
			return 'Gültige E-Mail-Adresse';
		}

		return null;
	}

	collectErrors() {
		return this.fields.map((field) => field.dataset.errorMessage).filter((message) => Boolean(message));
	}

	updateErrorSummary(errors, shouldFocus = false) {
		if (!this.errorContainer || !this.errorList) return;

		if (errors.length === 0) {
			this.errorList.replaceChildren();
			this.errorContainer.classList.add(CLASS_HIDDEN);
			this.errorContainer.removeAttribute('aria-live');
			return;
		}

		const items = errors.map((message) => {
			const item = document.createElement('li');
			item.className = 'text-sm text-amber-700';
			item.textContent = message;
			return item;
		});
		this.errorList.replaceChildren(...items);
		if (this.errorTitle) {
			this.errorTitle.textContent = this.options.defaultErrorTitle;
		}
		this.errorContainer.classList.remove(CLASS_HIDDEN);
		this.errorContainer.setAttribute('aria-live', 'assertive');

		if (shouldFocus) {
			this.focusErrorContainer();
		}
	}

	focusErrorContainer() {
		if (!this.errorContainer) return;
		this.errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		requestAnimationFrame(() => {
			this.errorContainer.focus({ preventScroll: true });
		});
	}

	getFieldLabel(field) {
		if (field.dataset.fieldLabel) return field.dataset.fieldLabel;

		const byFor = this.form.querySelector(`label[for="${field.id}"]`)?.textContent;
		if (byFor) return byFor.trim();
		return field.name || 'Feld';
	}

	destroy() {
		this.form.removeEventListener('submit', this.handleSubmit);
	}
}
