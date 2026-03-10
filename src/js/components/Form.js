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
