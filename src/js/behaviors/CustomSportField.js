export default class CustomSportField {
	constructor(selector = '[data-sport-select]') {
		this.selectEls = document.querySelectorAll(selector);
		if (!this.selectEls.length) return;

		this.selectEls.forEach((selectEl) => this.initSelect(selectEl));
	}

	initSelect(selectEl) {
		const targetSelector = selectEl.dataset.customTarget;
		if (!targetSelector) return;

		const targetEl = document.querySelector(targetSelector);
		if (!targetEl) return;

		const inputEl = targetEl.querySelector('[data-custom-sport-input]');
		if (!inputEl) return;

		const updateState = () => {
			const isCustom = selectEl.value === 'custom';
			targetEl.classList.toggle('hidden', !isCustom);
			inputEl.required = isCustom;

			if (!isCustom) {
				inputEl.value = '';
			}
		};

		selectEl.addEventListener('change', updateState);
		updateState();
	}
}
