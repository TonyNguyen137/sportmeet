import SibApiV3Sdk from 'sib-api-v3-sdk';
import config from '../config.js';

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = config.brevoApiKey;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export async function sendMail({ to, subject, html }) {
	if (!config.brevoApiKey) {
		throw new Error('BREVO_API_KEY fehlt');
	}

	if (!config.mailFromAddress) {
		throw new Error('MAIL_FROM_ADDRESS fehlt');
	}

	return emailApi.sendTransacEmail({
		sender: {
			name: config.mailFromName,
			email: config.mailFromAddress
		},
		to: [{ email: to }],
		subject,
		htmlContent: html
	});
}
