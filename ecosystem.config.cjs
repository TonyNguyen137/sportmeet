module.exports = {
	apps: [
		{
			name: 'sport-plattform',
			script: 'npm',
			args: 'start',
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			max_restarts: 10,
			restart_delay: 3000,
			time: true,
			env: {
				NODE_ENV: 'development'
			},
			env_production: {
				NODE_ENV: 'production'
			}
		}
	]
};
