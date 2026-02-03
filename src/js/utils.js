export function select(selector, scope = document) {
	return scope.querySelector(selector);
}

export function toArray(input, scope = document) {
	if (typeof input === 'string') {
		const elements = Array.from(scope.querySelectorAll(input));
		return elements.length ? elements : false;
	}

	return Array.from(input);
}

export function wrap(min, max, index) {
	// Handle array input
	if (Array.isArray(min)) {
		return this.wrapArray(min, max);
	}

	// Handle numeric range input
	return this.wrapRange(min, max, index);
}
