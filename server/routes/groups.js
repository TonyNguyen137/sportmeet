import express from 'express';
import { formParser } from '../utils/auth.js';
import { checkAuth } from '../middlewares/check-auth.js';
import {
	createGroup,
	deleteGroup,
	getGroupById,
	getGroupMembersList,
	joinGroupFromInviteLink,
	joinGroup,
	regenerateGroupInvite,
	removeGroupMember
} from '../controller/groups-controller.js';

export const createGroupsRouter = (
	handlers = {
		checkAuth,
		formParser,
		createGroup,
		deleteGroup,
		getGroupById,
		getGroupMembersList,
		joinGroupFromInviteLink,
		joinGroup,
		regenerateGroupInvite,
		removeGroupMember
	}
) => {
	const router = express.Router();
	router.get('/join', handlers.checkAuth, handlers.joinGroupFromInviteLink);
	router.get('/:groupId', handlers.checkAuth, handlers.getGroupById);
	router.get('/:groupId/members', handlers.checkAuth, handlers.getGroupMembersList);
	router.post('/', handlers.checkAuth, handlers.formParser, handlers.createGroup);
	router.post('/join', handlers.checkAuth, handlers.formParser, handlers.joinGroup);
	router.post(
		'/:groupId/regenerate-invite',
		handlers.checkAuth,
		handlers.regenerateGroupInvite
	);
	router.post('/:groupId/delete', handlers.checkAuth, handlers.deleteGroup);
	router.post(
		'/:groupId/members/:memberId/remove',
		handlers.checkAuth,
		handlers.removeGroupMember
	);
	router.delete(
		'/:groupId/members/:memberId',
		handlers.checkAuth,
		handlers.removeGroupMember
	);

	return router;
};

export default createGroupsRouter();
