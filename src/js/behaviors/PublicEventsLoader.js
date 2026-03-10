export default class PublicEventsLoader {
	constructor() {
		this.tabEl = document.querySelector('[data-public-events-tab]');
		this.panelEl = document.querySelector('[data-public-events-panel]');
		this.resultsEl = document.querySelector('[data-public-events-results]');
		this.loadingEl = document.querySelector('[data-public-events-loading]');
		this.emptyEl = document.querySelector('[data-public-events-empty]');
		this.retryBtn = document.querySelector('[data-public-events-search]');
		this.spriteUrl = this.panelEl?.dataset.publicEventsSpriteUrl || '/public/sprite.svg';
		this.retryBtnOriginalHTML = this.retryBtn?.innerHTML || '';
		this.hasLoadedOnce = false;
		this.isLoading = false;

		if (!this.tabEl || !this.panelEl || !this.resultsEl || !this.loadingEl || !this.emptyEl) {
			return;
		}

		this.tabEl.addEventListener('click', () => {
			if (!this.hasLoadedOnce) {
				this.load();
			}
		});

		if (this.retryBtn) {
			this.retryBtn.addEventListener('click', () => {
				this.load({ force: true });
			});
		}
	}

	setState({ showResults = false, showLoading = false, showEmpty = false } = {}) {
		this.resultsEl.classList.toggle('hidden', !showResults);
		this.loadingEl.classList.toggle('hidden', !showLoading);
		this.loadingEl.classList.toggle('grid', showLoading);
		this.emptyEl.classList.toggle('hidden', !showEmpty);
		this.emptyEl.classList.toggle('grid', showEmpty);
	}

	setSearchButtonLoading(isLoading) {
		if (!this.retryBtn) {
			return;
		}

		if (isLoading) {
			this.retryBtn.disabled = true;
			this.retryBtn.classList.add('opacity-80', 'cursor-default');
			this.retryBtn.innerHTML = `
				<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
					<circle class="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"></circle>
					<path class="opacity-100" fill="currentColor" d="M22 12a10 10 0 0 0-10-10v3a7 7 0 0 1 7 7h3z"></path>
				</svg>
				<span>Termine werden geladen...</span>
			`;
			return;
		}

		this.retryBtn.disabled = false;
		this.retryBtn.classList.remove('opacity-80', 'cursor-default');
		if (this.retryBtnOriginalHTML) {
			this.retryBtn.innerHTML = this.retryBtnOriginalHTML;
		}
	}

	delay(ms) {
		return new Promise((resolve) => {
			window.setTimeout(resolve, ms);
		});
	}

	async getCurrentPosition() {
		if (!navigator.geolocation) {
			return null;
		}

		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => resolve(position),
				() => resolve(null),
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 60000
				}
			);
		});
	}

	escapeHtml(value) {
		return String(value ?? '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	formatDateTime(value) {
		try {
			return `${new Date(value).toLocaleString('de-DE', {
				dateStyle: 'short',
				timeStyle: 'short'
			})} Uhr`;
		} catch {
			return '';
		}
	}

	renderEvents(events) {
		this.resultsEl.innerHTML = events
			.map((event) => {
				const fullAddress =
					`${event.street || ''} ${event.house_number || ''}, ${event.postal_code || ''} ${event.city || ''}`.trim();
				const locationText = event.location_name ? this.escapeHtml(event.location_name) : '';
				const addressText = fullAddress || 'Adresse folgt';

				return `
					<a
						href="/events/${this.escapeHtml(event.id)}"
						class="block rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm transition-all hover:to-blue-100 hover:shadow-md focus:outline-none [--focus-color:var(--color-accent-blue)]">
						<div class="mb-3 flex items-start justify-between gap-3">
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-gray-900">${this.escapeHtml(event.title)}</h3>
								<div class="mt-1 flex flex-wrap items-center gap-2">
									<span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">${this.escapeHtml(event.sport_name)}</span>
								</div>
							</div>
							<span class="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">${this.escapeHtml(event.distance_km)} km</span>
						</div>

						<div class="mb-4 space-y-2 text-sm text-gray-600">
							<div class="flex items-center gap-2">
								<svg aria-hidden="true" width="16" height="16" class="text-gray-400 flex-shrink-0">
									<use href="${this.escapeHtml(`${this.spriteUrl}#calendar`)}"></use>
								</svg>
								<span>${this.escapeHtml(this.formatDateTime(event.start_datetime))}</span>
							</div>
							${
								event.location_name
									? `
							<div class="flex items-center gap-2">
								<svg aria-hidden="true" width="16" height="16" class="text-gray-400 flex-shrink-0">
									<use href="${this.escapeHtml(`${this.spriteUrl}#building`)}"></use>
								</svg>
								<span>${locationText}</span>
							</div>
							`
									: ''
							}
							<div class="flex items-center gap-2">
								<svg aria-hidden="true" width="16" height="16" class="text-gray-400 flex-shrink-0">
									<use href="${this.escapeHtml(`${this.spriteUrl}#address`)}"></use>
								</svg>
								<span>${this.escapeHtml(addressText)}</span>
							</div>
							<div class="flex items-center gap-2">
								<svg aria-hidden="true" width="16" height="16" class="text-gray-400 flex-shrink-0">
									<use href="${this.escapeHtml(`${this.spriteUrl}#group`)}"></use>
								</svg>
								<span>${this.escapeHtml(event.accepted_count)} Teilnehmer zugesagt</span>
							</div>
						</div>

						<div class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
							<span class="text-xs text-gray-600">Erstellt von <span class="font-semibold text-gray-900">${this.escapeHtml(event.creator_name)}</span></span>
							${event.is_created_by_current_user ? '<span class="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">Von dir erstellt</span>' : ''}
						</div>
					</a>
				`;
			})
			.join('');
	}

	async load({ force = false } = {}) {
		if (this.isLoading) {
			return;
		}

		if (this.hasLoadedOnce && !force) {
			return;
		}

		this.isLoading = true;
		this.setState({ showResults: false, showLoading: true, showEmpty: false });
		this.setSearchButtonLoading(true);

		try {
			const minimumLoadingTime = this.delay(2000);

			const position = await this.getCurrentPosition();
			if (!position) {
				await minimumLoadingTime;
				this.resultsEl.innerHTML = '';
				this.setState({ showResults: false, showLoading: false, showEmpty: true });
				return;
			}

			const lat = position.coords.latitude;
			const lng = position.coords.longitude;
			const response = await fetch(
				`/events/public/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusKm=10`,
				{
					headers: {
						Accept: 'application/json'
					}
				}
			);

			if (!response.ok) {
				throw new Error('Nearby events request failed');
			}

			await minimumLoadingTime;

			const payload = await response.json();
			const events = Array.isArray(payload?.events) ? payload.events : [];

			if (events.length === 0) {
				this.resultsEl.innerHTML = '';
				this.setState({ showResults: false, showLoading: false, showEmpty: true });
				this.hasLoadedOnce = true;
				return;
			}

			this.renderEvents(events);
			this.setState({ showResults: true, showLoading: false, showEmpty: false });
			this.hasLoadedOnce = true;
		} catch (error) {
			console.error('Fehler beim Laden öffentlicher Termine:', error);
			await this.delay(2000);
			this.setState({ showResults: false, showLoading: false, showEmpty: true });
		} finally {
			this.setSearchButtonLoading(false);
			this.isLoading = false;
		}
	}
}
