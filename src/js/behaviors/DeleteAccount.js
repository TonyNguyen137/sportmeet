export class DeleteAccount {
	constructor() {
		this.deleteAccountButton = document.querySelector('.btn-delete-account');

		if (!this.deleteAccountButton) {
			return;
		}

		this.deleteAccountButton.addEventListener(
			'click',
			this.handleDeleteAccount.bind(this)
		);
	}

	handleDeleteAccount() {
		if (
			confirm(
				'Bist du dir absolut sicher? Dein Account und alle Daten werden sofort gelöscht.'
			)
		) {
			fetch('/user/delete-account', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
				// Wir schicken keinen Body, da die Session dem Server sagt, wer gelöscht wird
			})
				.then((response) => {
					if (response.ok) {
						alert('Dein Account wurde gelöscht.');
						window.location.href = '/'; // Zurück zur Startseite
					} else {
						alert('Fehler beim Löschen des Accounts.');
					}
				})
				.catch((error) => console.error('Error:', error));
		}
	}
}
