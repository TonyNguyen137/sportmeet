import { getCsrfToken } from '../utils.js';

export default class RemoveEventParticipant {
	constructor() {
		this.participantsList = document.querySelector('[data-event-participants-list]');

		if (!this.participantsList) {
			return;
		}

		this.participantsList.addEventListener('click', this.handleClick.bind(this));
	}

	async handleClick(event) {
		const button = event.target.closest('[data-event-participant-kick]');

		if (!button) {
			return;
		}

		const kickUrl = button.dataset.kickUrl;
		const participantName = button.dataset.participantName || 'diesen Teilnehmer';

		if (!kickUrl) {
			return;
		}

		const isConfirmed = window.confirm(`Möchtest du ${participantName} wirklich aus dem Termin entfernen?`);

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
				let errorMessage = 'Entfernen fehlgeschlagen';
				try {
					const payload = await response.json();
					if (payload?.error) {
						errorMessage = payload.error;
					}
				} catch {
					// ignore JSON parse errors and use fallback
				}
				throw new Error(errorMessage);
			}

			window.location.reload();
		} catch (error) {
			console.error('Fehler beim Entfernen des Teilnehmers:', error);
			alert(`Teilnehmer konnte nicht entfernt werden: ${error.message}`);
			button.disabled = false;
		}
	}
}
