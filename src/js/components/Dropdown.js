/**
 * Dropdown
 * --------
 * Reusable, accessible dropdown with full focus-trap logic.
 *
 * Focus-trap rules:
 *  - On open       -> focus moves to first focusable element inside list (or stays on toggle if none)
 *  - Tab           -> cycles forward; after last item wraps back to toggle
 *  - Shift+Tab     -> cycles backward; on toggle wraps to last item
 *  - Escape        -> closes and returns focus to toggle
 *  - Click outside -> closes
 *
 * Open state is tracked via presence of data-dropdown-is-open on the root element.
 */

class Dropdown {
	/**
	 * @param {string}   selector - CSS selector for the root wrapper (default: '[data-dropdown]')
	 * @param {Object}   options
	 * @param {string}   [options.toggleSelector='[data-dropdown-toggle]']
	 * @param {string}   [options.listSelector='[data-dropdown-list]']
	 * @param {string}   [options.focusableSelector] - Defaults to all natively focusable elements
	 * @param {Function} [options.onOpen]  - Callback fired after open
	 * @param {Function} [options.onClose] - Callback fired after close
	 */
	constructor(selector = '[data-dropdown]', options = {}) {
		this._root = document.querySelector(selector);

		if (!this._root) {
			console.info(`Dropdown: no element found for selector "${selector}"`);
			return;
		}

		this._config = {
			toggleSelector: '[data-dropdown-toggle]',
			listSelector: '[data-dropdown-list]',
			focusableSelector:
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			onOpen: null,
			onClose: null,
			...options
		};

		this._toggle = this._root.querySelector(this._config.toggleSelector);
		this._list = this._root.querySelector(this._config.listSelector);
		this._isOpen = false;

		if (!this._toggle || !this._list) {
			throw new Error('Dropdown: required toggle or list element not found');
		}

		this._handlers = {
			onToggleClick: this._onToggleClick.bind(this),
			onKeydown: this._onKeydown.bind(this),
			onOutsideClick: this._onOutsideClick.bind(this)
		};

		this._init();
	}

	// --- Private ----------------------------------------------------------------

	_init() {
		this._root.removeAttribute('data-dropdown-is-open');
		this._toggle.setAttribute('aria-expanded', 'false');
		this._toggle.setAttribute('aria-haspopup', 'true');
		this._list.setAttribute('role', 'menu');

		this._toggle.addEventListener('click', this._handlers.onToggleClick);
	}

	_getFocusableItems() {
		return Array.from(this._list.querySelectorAll(this._config.focusableSelector)).filter(
			(el) => !el.disabled && el.offsetParent !== null
		);
	}

	_onToggleClick() {
		this._isOpen ? this.close() : this.open();
	}

	_onKeydown(e) {
		const { key, shiftKey } = e;
		const items = this._getFocusableItems();
		const focused = document.activeElement;

		if (key === 'Escape') {
			e.preventDefault();
			this.close();
			this._toggle.focus();
			return;
		}

		if (key !== 'Tab') return;

		// No focusable items -> keep focus on toggle
		if (items.length === 0) {
			e.preventDefault();
			this._toggle.focus();
			return;
		}

		const firstItem = items[0];
		const lastItem = items[items.length - 1];

		if (!shiftKey) {
			if (focused === this._toggle) {
				e.preventDefault();
				firstItem.focus();
			} else if (focused === lastItem) {
				e.preventDefault();
				this._toggle.focus();
			}
		} else {
			if (focused === this._toggle) {
				e.preventDefault();
				lastItem.focus();
			} else if (focused === firstItem) {
				e.preventDefault();
				this._toggle.focus();
			}
		}
	}

	_onOutsideClick(e) {
		if (!this._root.contains(e.target)) this.close();
	}

	// --- Public API -------------------------------------------------------------

	open() {
		if (this._isOpen) return;

		this._isOpen = true;
		this._root.setAttribute('data-dropdown-is-open', '');
		this._toggle.setAttribute('aria-expanded', 'true');

		document.addEventListener('keydown', this._handlers.onKeydown);
		document.addEventListener('mousedown', this._handlers.onOutsideClick);

		const items = this._getFocusableItems();
		if (items.length > 0) items[0].focus();

		this._config.onOpen?.();
	}

	close() {
		if (!this._isOpen) return;

		this._isOpen = false;
		this._root.removeAttribute('data-dropdown-is-open');
		this._toggle.setAttribute('aria-expanded', 'false');

		document.removeEventListener('keydown', this._handlers.onKeydown);
		document.removeEventListener('mousedown', this._handlers.onOutsideClick);

		this._config.onClose?.();
	}

	/** Clean up all event listeners - call when removing the element from the DOM */
	destroy() {
		this.close();
		this._toggle.removeEventListener('click', this._handlers.onToggleClick);
	}
}

// --- Usage -------------------------------------------------------------------
//
//  Zero config:
//
//    new Dropdown();
//
//  Eigener selector:
//
//    new Dropdown('#my-dropdown');
//    new Dropdown('.nav-dropdown');
//
//  Mit Callbacks:
//
//    new Dropdown('[data-dropdown]', {
//      onOpen:  () => console.log('opened'),
//      onClose: () => console.log('closed'),
//    });
//
//  CSS hook fuer open/close:
//
//    [data-dropdown-is-open] { ... }
//
// -----------------------------------------------------------------------------

export default Dropdown;
