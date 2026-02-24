import { CLASS_ACTIVE, CLASS_HIDDEN } from '../css-classes.js';
const BLOCK_SELECTOR = '.view-switcher';
export default class ViewSwitcher {
	constructor(selector = BLOCK_SELECTOR) {
		this._blockEl = document.querySelector(selector);

		if (!this._blockEl) {
			console.warn(`ViewSwitcher: Element with selector "${BLOCK_SELECTOR}" not found`);
			return;
		}

		this._buttons = Array.from(
			this._blockEl.querySelectorAll(`${BLOCK_SELECTOR}__button`)
		);

		if (this._buttons.length === 0) {
			console.warn(
				`ViewSwitcher: No buttons found with selector "${BLOCK_SELECTOR}__button"`
			);
			return;
		}

		this._currentActive = this._buttons.find((el) => el.classList.contains(CLASS_ACTIVE));

		this._panels = new Map();

		this._buttons.forEach((button) => {
			const panelId = button.getAttribute('aria-controls');

			const panel = document.querySelector(`#${panelId}`);

			if (!panel) {
				console.warn(`ViewSwitcher: Panel with id "${panelId}" not found`);
			} else {
				this._panels.set(panelId, panel);
			}
		});

		this._bindEvents();
		this._applyInitialViewFromHash();
	}

	_bindEvents() {
		this._blockEl.addEventListener('click', this._setViews.bind(this));
	}

	_applyInitialViewFromHash() {
		const hash = window.location.hash.replace('#', '');
		console.log('hash', hash);

		if (!hash) return;

		const targetPanelId = hash === 'groups' ? 'view-groups' : hash;
		const targetButton = this._buttons.find(
			(button) => button.getAttribute('aria-controls') === targetPanelId
		);

		if (!targetButton || targetButton === this._currentActive) return;

		this._setViews({ target: targetButton });
	}

	// event listener

	_setViews(e) {
		const target = e.target.closest(`${BLOCK_SELECTOR}__button`);

		if (!target || target === this._currentActive) return;

		const newPanelId = target.getAttribute('aria-controls');

		const oldPanelId =
			this._currentActive && this._currentActive.getAttribute('aria-controls');

		const newPanel = this._panels.get(newPanelId);

		const oldPanel = oldPanelId && this._panels.get(oldPanelId);

		if (!newPanel) {
			console.warn('ViewSwitcher: Panel not found');
			return;
		}

		// Update buttons
		if (this._currentActive) {
			this._currentActive.classList.remove(CLASS_ACTIVE);
			this._currentActive.setAttribute('aria-pressed', 'false');
		}
		target.classList.add(CLASS_ACTIVE);
		target.setAttribute('aria-pressed', 'true');

		// Update panels
		oldPanel && oldPanel.classList.add(CLASS_HIDDEN);

		newPanel.classList.remove(CLASS_HIDDEN);

		// Update current active
		this._currentActive = target;
	}
}
