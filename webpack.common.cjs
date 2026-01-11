const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = {
	entry: {
		index: './src/js/index.js'
	},
	output: {
		clean: true
	},
	plugins: [
		new WebpackManifestPlugin({
			fileName: 'manifest.json' // landet in public/assets/manifest.json
		})
	],

	module: {
		rules: [
			{
				test: /\.(woff2?|eot|ttf|otf)$/i,
				type: 'asset/resource',
				generator: {
					filename: 'public/[name][ext]'
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
					filename: 'public/[name][ext]'
				}
			}
		]
	}
};
