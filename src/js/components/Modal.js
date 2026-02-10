import { CLASS_HIDDEN } from '../css-classes.js';

export default class Modal {
	constructor(root) {
		this.root = root;
		this.isOpen = false;
		this.lastActiveEl = null;

		// this._onKeyDown = this._onKeyDown.bind(this);
		// this._onClick = this._onClick.bind(this);

		this.root.addEventListener('click', this._onClick);
	}

	open(e) {
		if (this.isOpen) return;
		this.isOpen = true;

		// remember where focus was
		this.lastActiveEl = document.activeElement;

		this.root.classList.remove('hidden');
		this.root.setAttribute('aria-hidden', 'false');

		const modalTarget = e.target.dataset.modalTarget;

		if (modalTarget) {
			const targetEl = this.root.querySelector(modalTarget);
			if (targetEl) {
				targetEl.classList.remove(CLASS_HIDDEN);
			} else {
				console.warn(`[Modal] No focus target found for selector "${modalTarget}".`);
			}
		}

		// move focus into modal (close btn preferred)
		const focusTarget =
			this.root.querySelector('[data-close-modal]') ||
			this.root.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);

		focusTarget?.focus?.();

		document.addEventListener('keydown', this._onKeyDown);
	}

	close(e) {
		if (!this.isOpen) return;
		this.isOpen = false;

		// 1) move focus OUT of the modal first
		this.lastActiveEl?.focus?.();
		this.lastActiveEl = null;

		// 2) now it’s safe to hide from AT and visually
		this.root.setAttribute('aria-hidden', 'true');
		this.root.classList.add('hidden');

		const modalTarget = e.target.closest('[data-close-modal]')?.dataset?.modalTarget;

		if (modalTarget) {
			const targetEl = this.root.querySelector(modalTarget);
			if (targetEl) {
				targetEl.classList.add(CLASS_HIDDEN);
			} else {
				console.warn(`[Modal] No focus target found for selector "${modalTarget}".`);
			}
		}

		document.removeEventListener('keydown', this._onKeyDown);
	}

	// _onClick(e) {
	// 	if (e.target.matches('.modal')) this.close(e);
	// }

	// _onKeyDown(e) {
	// 	if (e.key === 'Escape') this.close();
	// }
}
