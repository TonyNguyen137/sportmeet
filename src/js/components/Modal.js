/**
 * Modal
 * -----
 * Reusable, accessible modal system with data-attribute API.
 *
 * Features:
 *  - Multiple independent modals on one page
 *  - Modal groups: only one group visible at a time inside a modal
 *  - Multiple trigger buttons can target the same modal + group
 *  - Focus trap (Tab / Shift+Tab cycle inside modal-inner)
 *  - Close via Escape, outside click (overlay), or data-modal-close buttons
 *  - Scroll lock on <body> while modal is open
 *  - Open state tracked via data-attributes (Tailwind friendly)
 *
 * HTML API:
 *  data-modal="id"               - Root modal element
 *  data-modal-inner              - The visible card (click outside this = close)
 *  data-modal-group="name"       - A group panel inside modal-inner
 *  data-modal-open="id"          - Trigger button (opens modal)
 *  data-modal-open="id:group"    - Trigger button (opens modal + activates group)
 *  data-modal-close              - Any button inside modal that closes it
 *
 * State attributes set by JS:
 *  data-modal-isopen="true/false"         - on [data-modal]
 *  data-modal-group-active="true/false"   - on each [data-modal-group]
 */

class Modal {
	/**
	 * @param {string} modalId - Value of the data-modal attribute
	 */
	constructor(modalId) {
		this._id = modalId;
		this._root = document.querySelector(`[data-modal="${modalId}"]`);

		if (!this._root) {
			throw new Error(`Modal: no element found for data-modal="${modalId}"`);
		}

		this._inner = this._root.querySelector('[data-modal-inner]');
		this._groups = Array.from(this._root.querySelectorAll('[data-modal-group]'));
		this._isOpen = false;

		if (!this._inner) {
			throw new Error(`Modal: no [data-modal-inner] found inside modal "${modalId}"`);
		}

		this._focusableSelector = [
			'a[href]',
			'button:not([disabled])',
			'input:not([disabled])',
			'select:not([disabled])',
			'textarea:not([disabled])',
			'[tabindex]:not([tabindex="-1"])'
		].join(', ');

		this._handlers = {
			onKeydown: this._onKeydown.bind(this),
			onRootClick: this._onRootClick.bind(this)
		};

		this._init();
	}

	// --- Private ----------------------------------------------------------------

	_init() {
		// Set initial state
		this._root.setAttribute('data-modal-isopen', 'false');

		// Init groups: all start as inactive
		this._groups.forEach((group) => {
			group.setAttribute('data-modal-group-active', 'false');
		});

		// Wire up internal close buttons
		this._root.querySelectorAll('[data-modal-close]').forEach((btn) => {
			btn.addEventListener('click', () => this.close());
		});

		// Close when clicking outside the modal card (overlay area)
		this._root.addEventListener('click', this._handlers.onRootClick);
	}

	_onRootClick(e) {
		if (!this._isOpen) return;
		if (e.target.closest('[data-modal-inner]')) return;
		this.close();
	}

	_getFocusableItems() {
		return Array.from(this._inner.querySelectorAll(this._focusableSelector)).filter(
			(el) => !el.disabled && el.offsetParent !== null
		);
	}

	_onKeydown(e) {
		if (e.key === 'Escape') {
			e.preventDefault();
			this.close();
			return;
		}

		if (e.key !== 'Tab') return;

		const items = this._getFocusableItems();
		if (items.length === 0) {
			e.preventDefault();
			return;
		}

		const first = items[0];
		const last = items[items.length - 1];
		const focused = document.activeElement;

		if (!e.shiftKey && focused === last) {
			e.preventDefault();
			first.focus();
		} else if (e.shiftKey && focused === first) {
			e.preventDefault();
			last.focus();
		}
	}

	_activateGroup(groupName) {
		if (this._groups.length === 0) return;

		this._groups.forEach((group) => {
			const isTarget = group.dataset.modalGroup === groupName;
			group.setAttribute('data-modal-group-active', isTarget ? 'true' : 'false');
		});
	}

	_storeTrigger(triggerEl) {
		this._lastTrigger = triggerEl;
	}

	// --- Public API -------------------------------------------------------------

	/**
	 * Open the modal, optionally activating a specific group.
	 * @param {string}      [groupName] - data-modal-group value to activate
	 * @param {HTMLElement} [trigger]   - The button that triggered the open (for focus return)
	 */
	open(groupName, trigger) {
		if (trigger) this._storeTrigger(trigger);

		if (groupName) this._activateGroup(groupName);

		this._isOpen = true;
		this._root.setAttribute('data-modal-isopen', 'true');
		document.body.setAttribute('data-modal-scroll-lock', '');

		document.addEventListener('keydown', this._handlers.onKeydown);

		// Focus first focusable element
		const items = this._getFocusableItems();
		if (items.length > 0) {
			// Defer to let display changes settle
			requestAnimationFrame(() => items[0].focus());
		}
	}

	close() {
		if (!this._isOpen) return;

		this._isOpen = false;
		this._root.setAttribute('data-modal-isopen', 'false');
		document.body.removeAttribute('data-modal-scroll-lock');

		// Reset all groups
		this._groups.forEach((group) => {
			group.setAttribute('data-modal-group-active', 'false');
		});

		document.removeEventListener('keydown', this._handlers.onKeydown);

		// Return focus to the trigger that opened the modal
		if (this._lastTrigger) {
			this._lastTrigger.focus();
			this._lastTrigger = null;
		}
	}

	destroy() {
		this.close();
	}
}

/**
 * ModalManager
 * ------------
 * Initializes all modals on the page and wires up trigger buttons.
 *
 */
export default class ModalManager {
	constructor() {
		this._modals = new Map();
		this._init();
	}

	_init() {
		// Register all modals found on the page
		document.querySelectorAll('[data-modal]').forEach((el) => {
			const id = el.dataset.modal;
			if (!id) return;
			this._modals.set(id, new Modal(id));
		});

		// Wire up all trigger buttons
		document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
			trigger.addEventListener('click', () => {
				const value = trigger.dataset.modalOpen; // e.g. "my-modal" or "my-modal:group-2"
				const [id, groupName] = value.split(':');
				const modal = this._modals.get(id);

				if (!modal) {
					console.warn(`ModalManager: no modal registered with id "${id}"`);
					return;
				}

				modal.open(groupName, trigger);
			});
		});
	}

	/** Get a modal instance by id for programmatic control */
	get(id) {
		return this._modals.get(id) ?? null;
	}
}
