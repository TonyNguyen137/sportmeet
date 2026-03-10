import { CLASS_HIDDEN } from '../css-classes.js';

export default class EventVisibilitySwitcher {
	constructor(selector = '[data-event-form]') {
		this.form = document.querySelector(selector);
		if (!this.form) return;

		this.visibilityInput = this.form.querySelector('[data-event-visibility-input]');
		this.optionButtons = Array.from(this.form.querySelectorAll('[data-event-visibility-option]'));
		this.privateFields = this.form.querySelector('[data-event-private-fields]');
		this.groupSelect = this.form.querySelector('[data-event-group-select]');

		if (!this.visibilityInput || this.optionButtons.length === 0) return;

		this.optionButtons.forEach((button) => {
			button.addEventListener('click', () => {
				const nextVisibility = button.dataset.eventVisibilityOption;
				this.setVisibility(nextVisibility);
			});
		});

		this.setVisibility(this.visibilityInput.value || 'public');
	}

	setVisibility(nextVisibility) {
		const visibility = nextVisibility === 'private' ? 'private' : 'public';
		this.visibilityInput.value = visibility;

		this.optionButtons.forEach((button) => {
			const isActive = button.dataset.eventVisibilityOption === visibility;
			button.setAttribute('aria-pressed', String(isActive));

			button.classList.toggle('border-green-500', isActive && visibility === 'public');
			button.classList.toggle('bg-green-50', isActive && visibility === 'public');
			button.classList.toggle('border-blue-500', isActive && visibility === 'private');
			button.classList.toggle('bg-blue-50', isActive && visibility === 'private');
			button.classList.toggle('border-gray-200', !isActive);
			button.classList.toggle('bg-white', !isActive);
		});

		if (!this.privateFields || !this.groupSelect) {
			return;
		}

		const isPrivate = visibility === 'private';
		this.privateFields.classList.toggle(CLASS_HIDDEN, !isPrivate);
		this.groupSelect.required = isPrivate;
		if (!isPrivate) {
			this.groupSelect.value = '';
		}
	}
}
