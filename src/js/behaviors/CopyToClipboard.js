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
			await this.copyText(text);

			this.setIconState(button, true);

			this.queueReset(button, {
				labelEl,
				defaultLabel
			});
		} catch (error) {
			console.error('Kopieren fehlgeschlagen:', error);
		}
	}

	async copyText(text) {
		// Modern API: works in secure contexts (https/localhost).
		if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
			await navigator.clipboard.writeText(text);
			return;
		}

		// Fallback for older/insecure environments.
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.setAttribute('readonly', '');
		textArea.style.position = 'fixed';
		textArea.style.top = '-9999px';
		textArea.style.left = '-9999px';

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		const success = document.execCommand('copy');
		document.body.removeChild(textArea);

		if (!success) {
			throw new Error('Clipboard API nicht verfügbar und Fallback fehlgeschlagen.');
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
