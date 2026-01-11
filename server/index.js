import app from './app.js';
import config from './config.js';

const port = config.port;

app.listen(port, () => {
	if (config.env === 'development') {
		console.log(`App listening at http://localhost:${port}`);
	} else {
		console.log(`App listening at ${port}`);
	}
});
