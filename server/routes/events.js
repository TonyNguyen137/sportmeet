import express from 'express';
import { formParser } from '../utils/auth.js';
import { checkAuth } from '../middlewares/check-auth.js';
import {
	createEvent,
	createEventComment,
	deleteEvent,
	getEditEventPage,
	getEventCommentsList,
	getEventById,
	getEventParticipantsList,
	getNearbyPublicEvents,
	getVisibleEvents,
	joinEvent,
	leaveEvent,
	removeEventComment,
	removeEventParticipant,
	updateEvent
} from '../controller/events-controller.js';

export const createEventsRouter = (
	handlers = {
		checkAuth,
		formParser,
		createEvent,
		createEventComment,
		deleteEvent,
		getEditEventPage,
		getEventCommentsList,
		getEventById,
		getEventParticipantsList,
		getNearbyPublicEvents,
		getVisibleEvents,
		joinEvent,
		leaveEvent,
		removeEventComment,
		removeEventParticipant,
		updateEvent
	}
) => {
	const router = express.Router();

	router.get('/', handlers.checkAuth, handlers.getVisibleEvents);
	router.post('/', handlers.checkAuth, handlers.formParser, handlers.createEvent);
	router.get('/public/nearby', handlers.checkAuth, handlers.getNearbyPublicEvents);
	router.get('/:eventId/edit', handlers.checkAuth, handlers.getEditEventPage);
	router.put('/:eventId', handlers.checkAuth, handlers.formParser, handlers.updateEvent);
	router.post('/:eventId/edit', handlers.checkAuth, handlers.formParser, handlers.updateEvent);
	router.get('/:eventId', handlers.checkAuth, handlers.getEventById);
	router.get('/:eventId/participants', handlers.checkAuth, handlers.getEventParticipantsList);
	router.get('/:eventId/comments', handlers.checkAuth, handlers.getEventCommentsList);
	router.post('/:eventId/join', handlers.checkAuth, handlers.joinEvent);
	router.post('/:eventId/leave', handlers.checkAuth, handlers.leaveEvent);
	router.delete('/:eventId', handlers.checkAuth, handlers.deleteEvent);
	router.post('/:eventId/delete', handlers.checkAuth, handlers.deleteEvent);
	router.post('/:eventId/comments', handlers.checkAuth, handlers.formParser, handlers.createEventComment);
	router.post('/:eventId/comments/:commentId/delete', handlers.checkAuth, handlers.removeEventComment);
	router.delete('/:eventId/comments/:commentId', handlers.checkAuth, handlers.removeEventComment);
	router.post('/:eventId/participants/:participantId/remove', handlers.checkAuth, handlers.removeEventParticipant);
	router.delete('/:eventId/participants/:participantId', handlers.checkAuth, handlers.removeEventParticipant);

	return router;
};

export default createEventsRouter();
