import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
	if (process.env.NODE_ENV === 'development') {
		console.log(`App listening at http://localhost:${port}`);
	} else {
		console.log(`App listening at ${port}`);
	}
});
