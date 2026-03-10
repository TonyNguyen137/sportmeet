import express from 'express';
import { deleteAccount, updateProfile } from '../controller/user-controller.js';
import { formParser } from '../utils/auth.js';
import { checkAuth } from '../middlewares/check-auth.js';

const router = express.Router();

router.post('/profile', checkAuth, formParser, updateProfile);
router.post('/delete-account', checkAuth, deleteAccount);

export default router;
