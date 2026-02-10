import express from 'express';

export const formParser = express.urlencoded({ extended: true });
