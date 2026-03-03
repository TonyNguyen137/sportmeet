import { getCsrfToken } from '../utils.js';

export default class RemoveEventComment {
	constructor() {
		this.commentsList = document.querySelector('[data-event-comments-list]');

		if (!this.commentsList) {
			return;
		}

		this.commentsList.addEventListener('click', this.handleClick.bind(this));
	}

	async handleClick(event) {
		const button = event.target.closest('[data-event-comment-delete]');

		if (!button) {
			return;
		}

		const deleteUrl = button.dataset.deleteUrl;
		if (!deleteUrl) {
			return;
		}

		const isConfirmed = window.confirm('Möchtest du diese Nachricht wirklich löschen?');

		if (!isConfirmed) {
			return;
		}

		button.disabled = true;

		try {
			const response = await fetch(deleteUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': getCsrfToken()
				}
			});

			if (!response.ok) {
				let errorMessage = 'Löschen fehlgeschlagen';
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
			console.error('Fehler beim Löschen der Nachricht:', error);
			alert(`Nachricht konnte nicht gelöscht werden: ${error.message}`);
			button.disabled = false;
		}
	}
}
