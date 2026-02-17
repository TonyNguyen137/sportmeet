export class LogoutAccount {
	constructor() {
		this.logoutButton = document.querySelector('.btn-logout');

		if (!this.logoutButton) {
			return;
		}

		this.logoutButton.addEventListener('click', this.handleLogout.bind(this));
	}

	async handleLogout() {
		try {
			const response = await fetch('/auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				// Optional: Ein Toast statt eines nervigen alert()
				window.location.href = '/';
			} else {
				console.error('Logout fehlgeschlagen');
			}
		} catch (error) {
			console.error('Netzwerkfehler:', error);
		}
	}
}
