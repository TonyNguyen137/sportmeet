import express from 'express';
export { checkAuth } from '../middlewares/check-auth.js';

export const formParser = express.urlencoded({ extended: true });
