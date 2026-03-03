import { getCsrfToken } from '../utils.js';

export default class RemoveGroupMember {
	constructor() {
		this.membersList = document.querySelector('[data-group-members-list]');

		if (!this.membersList) {
			return;
		}

		this.membersList.addEventListener('click', this.handleClick.bind(this));
	}

	async handleClick(event) {
		const button = event.target.closest('[data-group-member-kick]');

		if (!button) {
			return;
		}

		const kickUrl = button.dataset.kickUrl;
		const memberName = button.dataset.memberName || 'dieses Mitglied';

		if (!kickUrl) {
			return;
		}

		const isConfirmed = window.confirm(
			`Möchtest du ${memberName} wirklich aus der Gruppe entfernen?`
		);

		if (!isConfirmed) {
			return;
		}

		button.disabled = true;

		try {
			const response = await fetch(kickUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': getCsrfToken()
				}
			});

			if (!response.ok) {
				throw new Error('Entfernen fehlgeschlagen');
			}

			window.location.reload();
		} catch (error) {
			console.error('Fehler beim Entfernen des Gruppenmitglieds:', error);
			alert('Mitglied konnte nicht entfernt werden.');
			button.disabled = false;
		}
	}
}
