export default class Modal {
	constructor(root) {
		this.root = root;
		this.isOpen = false;

		this._onKeyDown = this._onKeyDown.bind(this);
		this._onClick = this._onClick.bind(this);

		// one delegated listener: any [data-close-modal] inside closes
		this.root.addEventListener('click', this._onClick);
	}

	open() {
		if (this.isOpen) return;
		this.isOpen = true;

		this.root.classList.remove('hidden');
		this.root.setAttribute('aria-hidden', 'false');
		document.addEventListener('keydown', this._onKeyDown);
	}

	close() {
		if (!this.isOpen) return;
		this.isOpen = false;

		this.root.classList.add('hidden');
		this.root.setAttribute('aria-hidden', 'true');
		document.removeEventListener('keydown', this._onKeyDown);
	}

	_onClick(e) {
		if (e.target.closest('[data-close-modal]')) this.close();
	}

	_onKeyDown(e) {
		if (e.key === 'Escape') this.close();
	}
}
