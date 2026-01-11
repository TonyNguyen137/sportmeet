const path = require('node:path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const common = require('./webpack.common.cjs');
const { merge } = require('webpack-merge');

module.exports = function (env, argv) {
	console.log('env: ', env);
	console.log('argv: ', argv);
	const isServe = !!argv.env['WEBPACK_SERVE'];

	console.log('isServe: ', isServe);

	return merge(common, {
		mode: 'development',
		output: {
			path: path.join(__dirname, 'public'),
			filename: '[name].min.js'
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename: function (pathData) {
					return pathData.chunk.name === 'index' ? 'styles.min.css' : '[name].min.css';
				}
			})
		],
		module: {
			rules: [
				{
					test: /\.css$/i,
					use: [
						MiniCssExtractPlugin.loader,
						{ loader: 'css-loader', options: { importLoaders: 1 } },
						'postcss-loader'
					]
				}
			]
		}
	});
};
