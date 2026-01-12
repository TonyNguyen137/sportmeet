const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

const { createHash } = require('node:crypto');
const fs = require('node:fs');
module.exports = {
	entry: {
		index: './src/js/index.js'
	},
	output: {
		clean: true
	},
	plugins: [
		new RemoveEmptyScriptsPlugin(),
		new WebpackManifestPlugin({
			fileName: 'manifest.json' // landet in public/assets/manifest.json
		}),
		new CopyWebpackPlugin({
			patterns: [
				// 1) sprite.svg mit Hash
				{
					from: 'src/assets/svg/sprite.svg',
					to({ absoluteFilename }) {
						const buf = fs.readFileSync(absoluteFilename);
						const hash = createHash('md5').update(buf).digest('hex').slice(0, 8);
						return `sprite.${hash}.svg`;
					}
				},

				// 2) Rest kopieren (sprite ausschließen)
				{
					from: 'src/assets/svg/logo',
					globOptions: {
						ignore: ['**/.DS_Store', '**/Thumbs.db', '**/sprite.svg']
					}
				}
			]
		})
	],

	module: {
		rules: [
			{
				test: /\.(woff2?|eot|ttf|otf)$/i,
				type: 'asset/resource',
				generator: {
					filename: '[name][ext]'
				}
			},

			{
				test: /\.(png|jpe?g|avif|svg|webp)$/i,
				type: 'asset', // Automatically chooses between inline/resource
				generator: {
					filename: '[name][ext]'
					// filename: (ob) => {
					// 	const params = new URLSearchParams(ob.module.resourceResolveData.query);
					// 	// Get the value of the 'w' parameter
					// 	const width = params.get('w');
					// 	const height = params.get('h');
					// 	if (width) {
					// 		return `public/[name]-${width}x${height}[ext]`;
					// 	}
					// 	return `public/[name][ext]`;
					// }
				},
				parser: {
					dataUrlCondition: {
						maxSize: 1 * 1024 // 1kb - files smaller will be inlined
					}
				}
			},

			{
				test: /sprite\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: '[name][ext]'
				}
			}
		]
	}
};
