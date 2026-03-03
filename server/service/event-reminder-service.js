/**
 * Event Reminder Service
 * ----------------------
 * Step 4: Mail dispatch for selected recipients.
 * - DB query for events in configurable reminder window
 * - DB query for accepted participants per event
 * - send reminder emails per recipient
 * - idempotency marker write in event_reminders
 */
import {
	findAcceptedParticipantsForEvent,
	findEventsDueForReminder,
	markEventReminderSent
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
		const dueEvents = await findEventsDueForReminder(leadMinutes, windowMinutes, 200);

		console.info('[event-reminder] due events selected', {
			count: dueEvents.length,
			leadMinutes,
			windowMinutes
		});

		let totalRecipients = 0;
		const eventRecipientBatches = [];

		for (const event of dueEvents) {
			const recipients = await findAcceptedParticipantsForEvent(event.id, 500);
			totalRecipients += recipients.length;

			eventRecipientBatches.push({
				event,
				recipients
			});
		}

		console.info('[event-reminder] recipients selected', {
			eventsCount: eventRecipientBatches.length,
			totalRecipients
		});

		let emailsSent = 0;
		let emailFailures = 0;
		let remindersMarked = 0;
		let remindersNotMarked = 0;

		for (const batch of eventRecipientBatches) {
			const { event, recipients } = batch;
			let eventHadFailures = false;

			for (const recipient of recipients) {
				const eventUrl = `${config.appBaseUrl.replace(/\/+$/, '')}/events/${event.id}`;
				const friendlyStartTime = formatDateTimeBerlin(event.start_datetime);

				const subject = `Erinnerung: ${event.title} in ${leadMinutes} Minuten`;
				const html = `
					<p>Hallo ${recipient.first_name || ''},</p>
					<p>Erinnerung: Dein Termin startet in etwa ${leadMinutes} Minuten.</p>
					<ul>
						<li><strong>Titel:</strong> ${event.title}</li>
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
				} catch (mailError) {
					emailFailures += 1;
					eventHadFailures = true;
					console.error('[event-reminder] mail send failed', {
						eventId: event.id,
						recipientEmail: recipient.email,
						error: mailError?.message || mailError
					});
				}
			}

			if (!eventHadFailures && recipients.length > 0) {
				const marked = await markEventReminderSent(event.id);
				if (marked) {
					remindersMarked += 1;
				}
			} else {
				remindersNotMarked += 1;
			}
		}

		console.info('[event-reminder] mail dispatch finished', {
			emailsSent,
			emailFailures,
			remindersMarked,
			remindersNotMarked
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
			dueEventsCount: dueEvents.length,
			totalRecipients,
			emailsSent,
			emailFailures,
			remindersMarked,
			remindersNotMarked
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
