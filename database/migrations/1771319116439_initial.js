/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
	// 1) USERS
	pgm.createTable('users', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: {
				precedence: 'BY DEFAULT'
			}
		},
		first_name: { type: 'varchar(120)', notNull: true },
		last_name: { type: 'varchar(120)', notNull: true },
		email: { type: 'varchar(255)', notNull: true, unique: true },
		password_hash: { type: 'text', notNull: true },
		created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
		deleted_at: { type: 'timestamptz', null: true }
	});

	// 2) GROUPS
	pgm.createTable('groups', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: {
				precedence: 'BY DEFAULT'
			}
		},
		name: { type: 'varchar(120)', notNull: true },
		invite_code: { type: 'varchar(32)', notNull: true, unique: true },
		created_by: {
			type: 'bigint',
			notNull: true,
			references: '"users"',
			onDelete: 'RESTRICT'
		},
		created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});

	// 3) GROUP_USERS
	pgm.createTable('group_users', {
		group_id: {
			type: 'bigint',
			notNull: true,
			references: '"groups"',
			onDelete: 'CASCADE'
		},
		user_id: {
			type: 'bigint',
			notNull: true,
			references: '"users"',
			onDelete: 'CASCADE'
		},
		role: { type: 'varchar(16)', notNull: true, default: 'member' },
		joined_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});
	pgm.addConstraint('group_users', 'group_users_pkey', {
		primaryKey: ['group_id', 'user_id']
	});
	pgm.addConstraint('group_users', 'group_users_role_check', {
		check: "role IN ('member', 'admin')"
	});

	// 4) SPORTS
	pgm.createTable('sports', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: {
				precedence: 'BY DEFAULT'
			}
		},
		name: { type: 'varchar(80)', notNull: true, unique: true }
	});

	// 5) EVENTS
	pgm.createTable('events', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: {
				precedence: 'BY DEFAULT'
			}
		},
		title: { type: 'varchar(140)', notNull: true },
		description: { type: 'text', null: true },
		sport_id: {
			type: 'bigint',
			null: true,
			references: '"sports"',
			onDelete: 'SET NULL'
		},
		custom_sport_name: { type: 'varchar(80)', null: true },
		start_datetime: { type: 'timestamptz', notNull: true },
		location_name: { type: 'varchar(140)', null: true },
		street: { type: 'varchar(140)', notNull: true },
		house_number: { type: 'varchar(20)', notNull: true },
		postal_code: { type: 'varchar(12)', notNull: true },
		city: { type: 'varchar(80)', notNull: true },
		country: { type: 'varchar(2)', notNull: true, default: 'DE' },
		latitude: { type: 'double precision', null: true },
		longitude: { type: 'double precision', null: true },
		is_public: { type: 'boolean', notNull: true, default: true },
		group_id: {
			type: 'bigint',
			null: true,
			references: '"groups"',
			onDelete: 'SET NULL'
		},
		created_by: {
			type: 'bigint',
			notNull: true,
			references: '"users"',
			onDelete: 'RESTRICT'
		},
		created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});
	pgm.addConstraint('events', 'events_sport_check', {
		check:
			'(sport_id IS NOT NULL AND custom_sport_name IS NULL) OR (sport_id IS NULL AND custom_sport_name IS NOT NULL)'
	});
	pgm.addConstraint('events', 'events_visibility_check', {
		check:
			'(is_public = TRUE AND group_id IS NULL) OR (is_public = FALSE AND group_id IS NOT NULL)'
	});

	// 6) EVENT_PARTICIPANTS
	pgm.createTable('event_participants', {
		event_id: {
			type: 'bigint',
			notNull: true,
			references: '"events"',
			onDelete: 'CASCADE'
		},
		user_id: {
			type: 'bigint',
			notNull: true,
			references: '"users"',
			onDelete: 'CASCADE'
		},
		status: { type: 'varchar(16)', notNull: true, default: 'accepted' },
		joined_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});
	pgm.addConstraint('event_participants', 'event_participants_pkey', {
		primaryKey: ['event_id', 'user_id']
	});
	pgm.addConstraint('event_participants', 'event_participants_status_check', {
		check: "status IN ('accepted', 'declined')"
	});

	// 7) COMMENTS
	pgm.createTable('comments', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: {
				precedence: 'BY DEFAULT'
			}
		},
		event_id: {
			type: 'bigint',
			notNull: true,
			references: '"events"',
			onDelete: 'CASCADE'
		},
		user_id: {
			type: 'bigint',
			notNull: true,
			references: '"users"',
			onDelete: 'CASCADE'
		},
		content: { type: 'text', notNull: true },
		created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
		deleted_at: { type: 'timestamptz', null: true }
	});

	// 8) EVENT_REMINDERS
	pgm.createTable('event_reminders', {
		event_id: {
			type: 'bigint',
			notNull: true,
			references: '"events"',
			onDelete: 'CASCADE',
			primaryKey: true
		},
		sent_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});

	// 9) SESSION
	pgm.createTable('session', {
		sid: {
			type: 'varchar',
			notNull: true,
			primaryKey: true
		},
		sess: { type: 'json', notNull: true },
		expire: { type: 'timestamptz', notNull: true }
	});

	// INDIZES
	pgm.createIndex('events', 'start_datetime');
	pgm.createIndex('events', 'group_id');
	pgm.createIndex('events', 'is_public');
	pgm.createIndex('comments', 'event_id');
	pgm.createIndex('session', 'expire');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
	pgm.dropTable('session');
	pgm.dropTable('event_reminders');
	pgm.dropTable('comments');
	pgm.dropTable('event_participants');
	pgm.dropTable('events');
	pgm.dropTable('sports');
	pgm.dropTable('group_users');
	pgm.dropTable('groups');
	pgm.dropTable('users');
};
