export default class Form {
	constructor(formElement, options = {}) {
		this.form = typeof formElement === 'string' ? document.querySelector(formElement) : formElement;

		this.options = {
			modules: [],
			...options
		};

		this.modules = [];
		this.state = {};
		this.init();
	}

	init() {
		if (!this.form) return;

		this.options.modules.forEach((entry) => {
			// Ein Formular setzt sich aus mehreren, austauschbaren Modulen zusammen
			// statt aus vielen spezialisierten Unterklassen.
			const definition =
				typeof entry === 'function'
					? { ModuleClass: entry, moduleOptions: {} }
					: {
							ModuleClass: entry?.module,
							moduleOptions: entry?.options || {}
						};

			const { ModuleClass, moduleOptions } = definition;
			if (!ModuleClass) return;

			const isAvailable = ModuleClass.isAvailable ? ModuleClass.isAvailable(this.form, moduleOptions) : true;
			if (!isAvailable) return;

			// Jedes Modul erweitert das Formular um ein klar abgegrenztes Verhalten,
			// z. B. Validierung oder Passwort-Sichtbarkeit.
			const moduleInstance = new ModuleClass(this.form, moduleOptions);

			this.modules.push(moduleInstance);
		});
	}

	getModule(ModuleClass) {
		return this.modules.find((m) => m instanceof ModuleClass);
	}

	hasModule(ModuleClass) {
		return this.modules.some((m) => m instanceof ModuleClass);
	}

	getFormData() {
		const formData = new FormData(this.form);
		return Object.fromEntries(formData);
	}

	destroy() {
		this.modules.forEach((module) => {
			if (typeof module.destroy === 'function') {
				module.destroy();
			}
		});
		this.modules = [];
	}
}
