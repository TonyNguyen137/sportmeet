import { consumeFlash, FLASH_KEYS } from '../utils/flash.js';

export const attachToast = (req, res, next) => {
	res.locals.toast = consumeFlash(req, FLASH_KEYS.toast, null);
	next();
};
