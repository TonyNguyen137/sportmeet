import { getCsrfToken } from '../utils.js';

export default class DeleteGroup {
	constructor() {
		this.deleteGroupButton = document.querySelector('.btn-delete-group');

		if (!this.deleteGroupButton) {
			return;
		}

		this.deleteGroupUrl = this.deleteGroupButton.dataset.groupDeleteUrl || '';
		this.groupName = this.deleteGroupButton.dataset.groupName || 'diese Gruppe';

		if (!this.deleteGroupUrl) {
			return;
		}

		this.deleteGroupButton.addEventListener('click', this.handleDeleteGroup.bind(this));
	}

	async handleDeleteGroup() {
		const isConfirmed = window.confirm(
			`Bist du sicher, dass du die Gruppe "${this.groupName}" löschen möchtest?`
		);

		if (!isConfirmed) {
			return;
		}

		this.deleteGroupButton.disabled = true;

		try {
			const response = await fetch(this.deleteGroupUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': getCsrfToken()
				}
			});

			if (!response.ok) {
				throw new Error('Löschen fehlgeschlagen');
			}

			window.location.href = '/me/groups';
		} catch (error) {
			console.error('Fehler beim Löschen der Gruppe:', error);
			alert('Gruppe konnte nicht gelöscht werden.');
			this.deleteGroupButton.disabled = false;
		}
	}
}
