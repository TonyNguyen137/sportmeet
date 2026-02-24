import config from '../config.js';

const GEOCODING_TIMEOUT_MS = 5000;

export const geocodeAddress = async ({
	street,
	houseNumber,
	postalCode,
	city,
	country = 'DE'
}) => {
	if (config.geocodingProvider !== 'nominatim') {
		throw new Error(`Unbekannter Geocoding-Provider: ${config.geocodingProvider}`);
	}

	const q = `${street} ${houseNumber}, ${postalCode} ${city}, ${country}`;
	const url = new URL('https://nominatim.openstreetmap.org/search');

	url.searchParams.set('q', q);
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('limit', '1');
	url.searchParams.set('countrycodes', country.toLowerCase());

	const response = await fetch(url, {
		headers: {
			'User-Agent': config.geocodingUserAgent
		},
		signal: AbortSignal.timeout(GEOCODING_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`Geocoding HTTP ${response.status}`);
	}

	const data = await response.json();
	const bestMatch = Array.isArray(data) ? data[0] : null;

	if (!bestMatch) {
		return null;
	}

	const latitude = Number(bestMatch.lat);
	const longitude = Number(bestMatch.lon);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return { latitude, longitude };
};
