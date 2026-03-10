import { getCsrfToken } from '../utils.js';

export default class DeleteEvent {
	constructor() {
		this.deleteEventButton = document.querySelector('.btn-delete-event');

		if (!this.deleteEventButton) {
			return;
		}

		this.deleteEventUrl = this.deleteEventButton.dataset.eventDeleteUrl || '';
		this.eventTitle = this.deleteEventButton.dataset.eventTitle || 'diesen Termin';

		if (!this.deleteEventUrl) {
			return;
		}

		this.deleteEventButton.addEventListener('click', this.handleDeleteEvent.bind(this));
	}

	async handleDeleteEvent() {
		const isConfirmed = window.confirm(`Bist du sicher, dass du den Termin "${this.eventTitle}" löschen möchtest?`);

		if (!isConfirmed) {
			return;
		}

		this.deleteEventButton.disabled = true;

		try {
			const response = await fetch(this.deleteEventUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': getCsrfToken()
				}
			});

			if (!response.ok) {
				throw new Error('Löschen fehlgeschlagen');
			}

			window.location.href = '/me';
		} catch (error) {
			console.error('Fehler beim Löschen des Termins:', error);
			alert('Termin konnte nicht gelöscht werden.');
			this.deleteEventButton.disabled = false;
		}
	}
}
