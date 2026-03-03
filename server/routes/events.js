import express from 'express';
import { checkAuth, formParser } from '../utils/auth.js';
import {
	createEvent,
	createEventComment,
	deleteEvent,
	getEventById,
	getNearbyPublicEvents,
	joinEvent,
	leaveEvent,
	removeEventComment,
	removeEventParticipant
} from '../controller/events-controller.js';

const router = express.Router();

router.post('/', checkAuth, formParser, createEvent);
router.get('/public/nearby', checkAuth, getNearbyPublicEvents);
router.get('/:eventId', checkAuth, getEventById);
router.post('/:eventId/join', checkAuth, joinEvent);
router.post('/:eventId/leave', checkAuth, leaveEvent);
router.post('/:eventId/delete', checkAuth, deleteEvent);
router.post('/:eventId/comments', checkAuth, formParser, createEventComment);
router.post('/:eventId/comments/:commentId/delete', checkAuth, removeEventComment);
router.post(
	'/:eventId/participants/:participantId/remove',
	checkAuth,
	removeEventParticipant
);

export default router;
