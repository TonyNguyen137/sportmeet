export default class CopyToClipboard {
	constructor(selector = '[data-copy-button]') {
		this.buttons = document.querySelectorAll(selector);
		this.resetTimers = new WeakMap();

		if (!this.buttons.length) return;

		this.buttons.forEach((button) => {
			button.addEventListener('click', (event) => this.handleCopyClick(event, button));
		});
	}

	async handleCopyClick(event, button) {
		event.preventDefault();
		event.stopPropagation();

		const text = button.dataset.copyText || '';
		if (!text) return;

		const labelEl = button.querySelector('[data-copy-label]');
		const defaultLabel = button.dataset.copyDefaultLabel || labelEl?.textContent || '';

		try {
			await navigator.clipboard.writeText(text);

			this.setIconState(button, true);

			this.queueReset(button, {
				labelEl,
				defaultLabel
			});
		} catch (error) {
			console.error('Kopieren fehlgeschlagen:', error);
		}
	}

	setIconState(button, isSuccess) {
		const defaultIcon = button.querySelector('[data-copy-icon-default]');
		const successIcon = button.querySelector('[data-copy-icon-success]');
		if (!defaultIcon || !successIcon) return;

		defaultIcon.classList.toggle('hidden', isSuccess);
		successIcon.classList.toggle('hidden', !isSuccess);
	}

	queueReset(button, { labelEl, defaultLabel }) {
		const existingTimer = this.resetTimers.get(button);
		if (existingTimer) {
			window.clearTimeout(existingTimer);
		}

		const timerId = window.setTimeout(() => {
			this.setIconState(button, false);

			if (labelEl) {
				labelEl.textContent = defaultLabel;
			}
		}, 1500);

		this.resetTimers.set(button, timerId);
	}
}
