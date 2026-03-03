/**
 * Event Reminder Service
 * ----------------------
 * Step 4: Mail dispatch for selected recipients.
 * - DB query for due recipients in configurable reminder window
 * - send reminder emails per recipient
 * - idempotency marker write in event_reminder_deliveries (event_id + user_id)
 */
import {
	findReminderRecipientsDue,
	markReminderDeliverySent
} from '../model/events-model.js';
import config from '../config.js';
import { sendMail } from '../utils/mailer.js';

const formatDateTimeBerlin = (value) =>
	new Date(value).toLocaleString('de-DE', {
		timeZone: 'Europe/Berlin',
		dateStyle: 'full',
		timeStyle: 'short'
	});

const formatTimestampBerlin = (value) =>
	new Date(value).toLocaleString('de-DE', {
		timeZone: 'Europe/Berlin',
		dateStyle: 'short',
		timeStyle: 'medium'
	});

export const runEventReminderJob = async () => {
	const startedAt = new Date();
	console.info('[event-reminder] job started', {
		startedAt: formatTimestampBerlin(startedAt)
	});

	try {
		const leadMinutes = config.eventReminderLeadMinutes;
		const windowMinutes = config.eventReminderWindowMinutes;
		const dueRecipients = await findReminderRecipientsDue(
			leadMinutes,
			windowMinutes,
			1000
		);
		const uniqueEventCount = new Set(dueRecipients.map((row) => row.id)).size;

		console.info('[event-reminder] due events selected', {
			count: uniqueEventCount,
			recipientsCount: dueRecipients.length,
			leadMinutes,
			windowMinutes
		});

		console.info('[event-reminder] recipients selected', {
			eventsCount: uniqueEventCount,
			totalRecipients: dueRecipients.length
		});

		let emailsSent = 0;
		let emailFailures = 0;
		let deliveriesMarked = 0;
		let deliveriesNotMarked = 0;

		for (const recipient of dueRecipients) {
			const eventUrl = `${config.appBaseUrl.replace(/\/+$/, '')}/events/${recipient.id}`;
			const friendlyStartTime = formatDateTimeBerlin(recipient.start_datetime);

			const subject = `Erinnerung: ${recipient.title} in ${leadMinutes} Minuten`;
			const html = `
				<p>Hallo ${recipient.first_name || ''},</p>
				<p>Erinnerung: Dein Termin startet in etwa ${leadMinutes} Minuten.</p>
				<ul>
					<li><strong>Titel:</strong> ${recipient.title}</li>
					<li><strong>Zeit:</strong> ${friendlyStartTime}</li>
				</ul>
				<p>
					<a href="${eventUrl}">Termin öffnen</a>
				</p>
			`;

			try {
				await sendMail({
					to: recipient.email,
					subject,
					html
				});
				emailsSent += 1;

				const marked = await markReminderDeliverySent(recipient.id, recipient.user_id);
				if (marked) {
					deliveriesMarked += 1;
				} else {
					deliveriesNotMarked += 1;
				}
			} catch (mailError) {
				emailFailures += 1;
				deliveriesNotMarked += 1;
				console.error('[event-reminder] mail send failed', {
					eventId: recipient.id,
					userId: recipient.user_id,
					recipientEmail: recipient.email,
					error: mailError?.message || mailError
				});
			}
		}

		console.info('[event-reminder] mail dispatch finished', {
			emailsSent,
			emailFailures,
			deliveriesMarked,
			deliveriesNotMarked
		});

		const finishedAt = new Date();
		console.info('[event-reminder] job finished', {
			startedAt: formatTimestampBerlin(startedAt),
			finishedAt: formatTimestampBerlin(finishedAt),
			durationMs: finishedAt.getTime() - startedAt.getTime()
		});

		return {
			ok: true,
			startedAt,
			finishedAt,
			durationMs: finishedAt.getTime() - startedAt.getTime(),
			dueEventsCount: uniqueEventCount,
			totalRecipients: dueRecipients.length,
			emailsSent,
			emailFailures,
			deliveriesMarked,
			deliveriesNotMarked
		};
	} catch (error) {
		const failedAt = new Date();
		console.error('[event-reminder] job failed', {
			startedAt: formatTimestampBerlin(startedAt),
			failedAt: formatTimestampBerlin(failedAt),
			error: error?.message || error
		});

		return {
			ok: false,
			startedAt,
			failedAt,
			error
		};
	}
};
