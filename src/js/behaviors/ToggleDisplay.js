import { NAMESPACE } from '../config.js';
import { CLASS_HIDDEN } from '../css-classes.js';

export default class ToggleDisplay {
	constructor(toggleSelector = `[data-${NAMESPACE}-toggle='display']`) {
		this._toggleEls = document.querySelectorAll(toggleSelector);

		if (!this._toggleEls || this._toggleEls.length === 0) return;

		let i = this._toggleEls.length;

		while (i--) {
			this._init(this._toggleEls[i]);
		}
	}

	_init(toggleEl) {
		const targetSelector = toggleEl.dataset[NAMESPACE + 'Target'];
		const targetEls = document.querySelectorAll(targetSelector);

		if (!targetEls || targetEls.length === 0) {
			console.warn(`Target element is missing. ToggleDisplay cannot be initialized.`);
			return;
		}
		const closeTargetSelector = toggleEl.dataset[NAMESPACE + 'CloseTarget'];
		const closeTargetEls = document.querySelectorAll(closeTargetSelector);

		const closeBtnsSelector = toggleEl.dataset[NAMESPACE + 'CloseBtn'];
		const closeBtns = document.querySelectorAll(closeBtnsSelector);

		toggleEl.addEventListener(
			'click',
			this._toggle.bind(this, toggleEl, targetEls, closeTargetEls)
		);

		if (closeBtns && closeBtns.length > 0) {
			closeBtns.forEach((btn) => {
				btn.addEventListener('click', this._reset.bind(this, toggleEl, targetEls));
			});
		}
	}

	// handler methods
	_toggle(toggleEl, targetEls, closeTargetEls) {
		const isExpanded = toggleEl.ariaExpanded === 'true';

		if (closeTargetEls || closeTargetEls.length > 0) {
			this._close(closeTargetEls);
		}

		targetEls.forEach((el) => {
			el.classList.toggle(CLASS_HIDDEN, isExpanded);
		});

		toggleEl.ariaExpanded = !isExpanded;
	}

	// helper methods
	_close(els) {
		els.forEach((closeEl) => {
			const id = closeEl.id;

			if (!id) {
				console.warn('[ToggleDisplay] Close target element has no id.', closeEl);
				return;
			}
			const toggleEl = document.querySelector(`[aria-controls=${id}]`);

			if (!toggleEl) {
				console.warn(
					`[ToggleDisplay] No toggle element found for close target "#${id}".`
				);
			} else {
				toggleEl.setAttribute('aria-expanded', false);
			}

			closeEl.classList.add(CLASS_HIDDEN);
		});
	}

	_reset(toggleEl, targetEls) {
		targetEls.forEach((el) => {
			el.classList.add(CLASS_HIDDEN);
		});
		toggleEl.ariaExpanded = false;
	}
}
