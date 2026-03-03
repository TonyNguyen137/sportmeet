import { Pool } from 'pg';
import config from '../config.js';

const pool = new Pool({
	connectionString: config.dbConnectionString
});

export default pool;
