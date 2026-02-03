import '../css/styles.css';
import ViewSwitcher from './components/ViewSwitcher.js';
import Tabs from './components/Tabs.js';
import Dropdown from './components/Dropdown.js';
import ToggleDisplay from './behaviors/ToggleDisplay.js';
import Modal from './components/Modal.js';

new ViewSwitcher();
new Tabs();
new Dropdown();
new ToggleDisplay();

const modalEl = document.querySelector('.modal');
const modal = modalEl ? new Modal(modalEl) : null;

document.addEventListener('click', (e) => {
	if (!modal) return;
	if (e.target.closest('[data-open-modal]')) modal.open();
	if (e.target.closest('[data-close-modal]')) modal.close();
});
