import Form from './Form.js';
import { FormValidation, PasswordRequirements, PasswordVisibilityToggle } from '../modules/form-modules/index.js';

class FormFactory {
	static createLoginForm(selector = '[data-login-form]') {
		// Die Factory liefert pro Formular-Typ genau die Modulkombination, die gebraucht wird.
		return new Form(selector, {
			modules: [PasswordVisibilityToggle, FormValidation]
		});
	}

	static createRegisterForm(selector = '[data-register-form]') {
		return new Form(selector, {
			modules: [PasswordVisibilityToggle, FormValidation, PasswordRequirements]
		});
	}

	static createForgotPasswordForm(selector = '[data-forgot-password-form]') {
		return new Form(selector, {
			modules: [FormValidation]
		});
	}

	static createResetPasswordForm(selector = '[data-reset-password-form]') {
		return new Form(selector, {
			modules: [PasswordVisibilityToggle, FormValidation, PasswordRequirements]
		});
	}

	static createGroupCreateForm(selector = '[data-group-form]') {
		return new Form(selector, {
			modules: [FormValidation]
		});
	}

	static createGroupEnterForm(selector = '[data-group-enter-form]') {
		return new Form(selector, {
			modules: [FormValidation]
		});
	}

	static createEventCreateForm(selector = '[data-event-form]') {
		return new Form(selector, {
			modules: [FormValidation]
		});
	}

	static createAll() {
		// Zentrale Initialisierung aller unterstützten Formulare beim Laden der Seite.
		return {
			login: this.createLoginForm(),
			register: this.createRegisterForm(),
			forgotPassword: this.createForgotPasswordForm(),
			resetPassword: this.createResetPasswordForm(),
			groupCreate: this.createGroupCreateForm(),
			groupEnter: this.createGroupEnterForm(),
			eventCreate: this.createEventCreateForm()
		};
	}
}

export default FormFactory;
