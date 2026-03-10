// External Packages
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

// Node.js Built-in Modules
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

// Local Project Files
import pool from './model/db.js';
import authRoutes, { createAuthRouter } from './routes/auth.js';
import userRoutes from './routes/user.js';
import eventsRoutes, { createEventsRouter } from './routes/events.js';
import groupsRoutes, { createGroupsRouter } from './routes/groups.js';
import {
	findAllSports,
	findCreatedEventsForUser,
	findMyEventsForUser
} from './model/dashboard-model.js';
import { consumeFlash, FLASH_KEYS } from './utils/flash.js';
import { checkAuth } from './middlewares/check-auth.js';
import { loadUserData } from './middlewares/load-user-data.js';
import { attachCsrfToken, requireCsrfToken } from './middlewares/csrf.js';
import { attachToast } from './middlewares/toast.js';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const PUBLIC_DIR_SLUG = '/public';
const PUBLIC_DIR_PATH = path.join(projectRoot, 'public');
const manifestPath = path.join(projectRoot, 'public', 'manifest.json');

const loadAssets = () => {
	if (fs.existsSync(manifestPath)) {
		return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	}

	console.warn('[assets] manifest.json not found:', manifestPath);
	return {
		'index.js': 'index.js',
		'index.css': 'styles.css',
		'sprite.svg': 'sprite.svg'
	};
};

const createDefaultSessionMiddleware = () => {
	const PostgresStore = connectPgSimple(session);

	return session({
		store: new PostgresStore({
			pool,
			tableName: 'session'
		}),
		name: 'sportmeet_sid',
		secret: config.sessionSecret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24,
			httpOnly: true,
			secure: config.env === 'production'
		}
	});
};

export const createApp = (
	deps = {
		config,
		consumeFlash,
		flashKeys: FLASH_KEYS,
		checkAuth,
		loadUserData,
		attachCsrfToken,
		requireCsrfToken,
		attachToast,
		findAllSports,
		findCreatedEventsForUser,
		findMyEventsForUser,
		sessionMiddleware: createDefaultSessionMiddleware(),
		authRoutes,
		userRoutes,
		eventsRoutes,
		groupsRoutes
	}
) => {
	const {
		config: appConfig,
		consumeFlash: consumeFlashValue,
		flashKeys,
		checkAuth: checkAuthValue,
		loadUserData: loadUserDataValue,
		attachCsrfToken: attachCsrfTokenValue,
		requireCsrfToken: requireCsrfTokenValue,
		attachToast: attachToastValue,
		findAllSports: findAllSportsValue,
		findCreatedEventsForUser: findCreatedEventsForUserValue,
		findMyEventsForUser: findMyEventsForUserValue,
		sessionMiddleware,
		authRoutes: authRoutesValue,
		userRoutes: userRoutesValue,
		eventsRoutes: eventsRoutesValue,
		groupsRoutes: groupsRoutesValue
	} = deps;

	const app = express();

	app.use(PUBLIC_DIR_SLUG, express.static(PUBLIC_DIR_PATH));

	app.locals.assets = loadAssets();
	app.locals.publicPrefix = PUBLIC_DIR_SLUG;

	app.set('views', path.join(projectRoot, 'server', 'view'));
	app.set('view engine', 'ejs');

	app.use(sessionMiddleware);
	app.use(express.urlencoded({ extended: true }));
	app.use((req, res, next) => {
		if (appConfig.env === 'development') {
			const assets = loadAssets();
			app.locals.assets = assets;
			res.locals.assets = assets;
		}

		next();
	});
	app.use(loadUserDataValue);
	app.use(attachCsrfTokenValue);
	app.use(requireCsrfTokenValue);
	app.use(attachToastValue);

	app.get('/', (req, res) => {
		if (req.session && req.session.userId) {
			return res.redirect('/me');
		}

		const loginFeedback = consumeFlashValue(req, flashKeys.loginFeedback, {});
		const authSuccess = consumeFlashValue(req, flashKeys.authSuccess, {});
		const hasLoginErrors =
			Array.isArray(loginFeedback.errors) && loginFeedback.errors.length > 0;
		const loginValues = hasLoginErrors
			? loginFeedback.values || {}
			: authSuccess.values || {};

		res.render('base', {
			title: 'SportMeet Startseite',
			template: 'index',
			loginErrorTitle:
				loginFeedback.errorTitle ||
				'Fehlende Angaben, bitte füllen Sie die gelisteten Felder aus:',
			loginErrors: loginFeedback.errors || [],
			loginValues,
			loginSuccessMessage: authSuccess.message || ''
		});
	});

	app.use('/', authRoutesValue);

	app.get('/me', checkAuthValue, async (req, res) => {
		try {
			const sports = await findAllSportsValue();
			const userId = req.session?.userId;
			const myEvents = userId ? await findMyEventsForUserValue(userId, 100) : [];
			const createdEvents = userId
				? await findCreatedEventsForUserValue(userId, 100)
				: [];
			const eventFormFeedback = consumeFlashValue(req, flashKeys.eventFormFeedback, {});

			return res.render('base', {
				title: 'SportMeet - Meine Termine',
				template: 'page-me-events',
				sports,
				myEvents,
				createdEvents,
				activeDashboardPage: 'events',
				eventFormFeedback
			});
		} catch (err) {
			console.error('Fehler beim Laden der Terminseite:', err);
			return res.status(500).send('Server Fehler');
		}
	});

	app.get('/me/events', checkAuthValue, (req, res) => res.redirect(301, '/me'));

	app.get('/me/profile', checkAuthValue, (req, res) => {
		const profileFeedback = consumeFlashValue(req, flashKeys.profileFeedback, {});
		const currentUser = res.locals.currentUser || {};

		return res.render('base', {
			title: 'SportMeet - Mein Profil',
			template: 'page-profile',
			activeDashboardPage: 'profile',
			profileErrorTitle: profileFeedback.errorTitle || '',
			profileErrors: profileFeedback.errors || [],
			profileSuccessMessage: profileFeedback.successMessage || '',
			profileValues: {
				firstName: profileFeedback.values?.firstName ?? currentUser.first_name ?? '',
				lastName: profileFeedback.values?.lastName ?? currentUser.last_name ?? '',
				email: currentUser.email ?? ''
			}
		});
	});

	app.get('/me/groups', checkAuthValue, async (req, res) => {
		try {
			const sports = await findAllSportsValue();

			return res.render('base', {
				title: 'SportMeet - Meine Gruppen',
				template: 'page-me-groups',
				sports,
				activeDashboardPage: 'groups'
			});
		} catch (err) {
			console.error('Fehler beim Laden der Gruppenseite:', err);
			return res.status(500).send('Server Fehler');
		}
	});

	app.use('/user', userRoutesValue);
	app.use('/events', eventsRoutesValue);
	app.use('/groups', groupsRoutesValue);

	if (appConfig.env === 'development') {
		app.get('/dev/error', (req, res, next) => {
			next(new Error('Testfehler: manuell ausgelöst'));
		});
	}

	app.use((req, res) => {
		return res.status(404).render('base', {
			title: '404 - Seite nicht gefunden',
			template: 'page-404'
		});
	});

	app.use((err, req, res, next) => {
		console.error('[error-handler]', err);

		if (res.headersSent) {
			return next(err);
		}

		const statusCode =
			Number.isInteger(err?.statusCode) && err.statusCode >= 400 ? err.statusCode : 500;

		const message =
			statusCode === 500
				? 'Es ist ein interner Serverfehler aufgetreten.'
				: err?.message || 'Ein Fehler ist aufgetreten.';

		if (req.accepts('html')) {
			return res.status(statusCode).render('base', {
				title: `${statusCode} - Fehler`,
				template: 'page-error',
				errorStatusCode: statusCode,
				errorMessage: message
			});
		}

		if (req.accepts('json')) {
			return res.status(statusCode).json({ error: message });
		}

		return res.status(statusCode).send(message);
	});

	return app;
};

export default createApp();

export { createAuthRouter, createEventsRouter, createGroupsRouter };
