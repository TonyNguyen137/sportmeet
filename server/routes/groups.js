import express from 'express';
import { checkAuth, formParser } from '../utils/auth.js';
import {
	createGroup,
	deleteGroup,
	getGroupById,
	joinGroupFromInviteLink,
	joinGroup,
	regenerateGroupInvite,
	removeGroupMember
} from '../controller/groups-controller.js';

const router = express.Router();
router.get('/join', checkAuth, joinGroupFromInviteLink);
router.get('/:groupId', checkAuth, getGroupById);
router.post('/', checkAuth, formParser, createGroup);
router.post('/join', checkAuth, formParser, joinGroup);
router.post('/:groupId/regenerate-invite', checkAuth, regenerateGroupInvite);
router.post('/:groupId/delete', checkAuth, deleteGroup);
router.post('/:groupId/members/:memberId/remove', checkAuth, removeGroupMember);

export default router;
