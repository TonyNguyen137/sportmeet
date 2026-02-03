const CLASS_OPEN = 'dropdown--open';

export default class Dropdown {
	constructor() {
		document.addEventListener('click', (e) => {
			const isDropdownButton = e.target.closest('.dropdown__toggle');

			if (!isDropdownButton && e.target.closest('.dropdown') != null) {
				return;
			}

			if (!e.target.closest('.dropdown')) {
				document.querySelectorAll(`.${CLASS_OPEN}`).forEach((dropdown) => {
					dropdown.classList.remove(CLASS_OPEN);
				});
			}

			let currentDropdown;
			if (isDropdownButton) {
				currentDropdown = e.target.closest('.dropdown');
				currentDropdown.classList.toggle(CLASS_OPEN);
			}

			// will not execute if node list is empty
			document.querySelectorAll(CLASS_OPEN).forEach((dropdown) => {
				if (dropdown === currentDropdown) return;
				dropdown.classList.remove(CLASS_OPEN);
			});
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				document.querySelectorAll(`.${CLASS_OPEN}`).forEach((dropdown) => {
					dropdown.classList.remove(CLASS_OPEN);
				});
			}
		});
	}
}
