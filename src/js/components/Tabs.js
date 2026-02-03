import { toArray, select, wrap } from '../utils.js';

export default class Tabs {
	constructor() {
		this._rootEls = toArray('.tabs');

		if (!this._rootEls) return;
		let i = this._rootEls.length; // total number of .tabs components on the page

		while (i--) {
			this._initRootEl(this._rootEls[i]);
		}
	}

	_initRootEl(rootEl) {
		rootEl.tabListEl = select('.tabs__list', rootEl);
		rootEl.tabEls = toArray('.tabs__tab', rootEl.tabListEl);
		rootEl.currentActiveTabEl = select("[aria-selected='true']", rootEl);
		rootEl.wrapperPanelsEl = select('.tabs__wrapper-panels', rootEl);

		// Prevent selecting panels from nested tabs
		rootEl.panelEls = toArray(':scope > .tabs__panel', rootEl.wrapperPanelsEl);

		// Event Listener
		rootEl.tabListEl.addEventListener('click', this._activeTab.bind(this));
		rootEl.tabListEl.addEventListener('keydown', this._keypressed.bind(this));
	}

	_setTab(tab, isEnabled, rootEl) {
		tab.ariaSelected = isEnabled;

		let index = rootEl.tabEls.indexOf(tab);
		rootEl.panelEls[index].ariaHidden = !isEnabled;

		if (isEnabled) {
			tab.removeAttribute('tabindex');
		} else {
			tab.tabIndex = '-1';
		}
	}

	_moveTab(event, direction = 0) {
		event.preventDefault();
		const rootEl = event.currentTarget.closest('.tabs');
		const currentActiveTabIndex = rootEl.tabEls.indexOf(rootEl.currentActiveTabEl);

		const nextTabEl = wrap(rootEl.tabEls, currentActiveTabIndex + direction);

		this._setTab(rootEl.currentActiveTabEl, false, rootEl);
		this._setTab(nextTabEl, true, rootEl);
		nextTabEl.focus();
		rootEl.currentActiveTabEl = nextTabEl;
	}

	// Event Handler
	_keypressed(e) {
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				this._moveTab(e, -1);
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				this._moveTab(e, +1);
				break;
			default:
				return;
		}
	}

	_activeTab(e) {
		console.log('clicked active tab');

		const clickedTabEl = e.target.closest('.tabs__tab');

		if (clickedTabEl === e.currentTarget.currentActiveTabEl || !clickedTabEl) return;

		const rootEl = e.currentTarget.closest('.tabs');

		this._setTab(rootEl.currentActiveTabEl, false, rootEl);
		this._setTab(clickedTabEl, true, rootEl);

		rootEl.currentActiveTabEl = clickedTabEl;
	}
}

/*
function reset() {
  const FIRST_TAB_INDEX = 0;

  let activeTabEls = this._rootEl.querySelectorAll('.tabs__tab[aria-selected="true"]');

  activeTabEls.forEach((tab, i) => {
    let activeTabElIndex = this._tabListEls[i].tabEls.indexOf(tab);

    if (activeTabElIndex === FIRST_TAB_INDEX) return;
    let tabListEl = this._tabListEls[i];
    let firstTabEl = tabListEl.tabEls[FIRST_TAB_INDEX];

    this._setTab(tab, false, tabListEl);
    this._setTab(firstTabEl, true, tabListEl);
    tabListEl.currentActiveTabEl = firstTabEl;
  });
}

*/
