export default class Toast {
	constructor(selector = '[data-toast]') {
		this.toastEls = Array.from(document.querySelectorAll(selector));
		if (!this.toastEls.length) return;

		this.toastEls.forEach((toastEl) => this.initToast(toastEl));
	}

	initToast(toastEl) {
		const closeBtn = toastEl.querySelector('[data-toast-close]');
		const duration = Number.parseInt(toastEl.dataset.toastDuration || '3200', 10);
		const safeDuration = Number.isFinite(duration) ? Math.max(duration, 1000) : 3200;

		const close = () => this.closeToast(toastEl);

		// Slide in from top after first paint.
		requestAnimationFrame(() => {
			toastEl.classList.remove('opacity-0', '-translate-y-3');
		});

		if (closeBtn) {
			closeBtn.addEventListener('click', close);
		}

		window.setTimeout(close, safeDuration);
	}

	closeToast(toastEl) {
		if (!toastEl || toastEl.dataset.toastClosing === 'true') return;
		toastEl.dataset.toastClosing = 'true';
		toastEl.classList.add('opacity-0', '-translate-y-2');

		window.setTimeout(() => {
			const root = toastEl.closest('[data-toast-root]');
			if (root) {
				root.remove();
				return;
			}

			toastEl.remove();
		}, 220);
	}
}
