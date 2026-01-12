const path = require('node:path');

const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const TerserPlugin = require('terser-webpack-plugin');

const { createHash } = require('node:crypto');
const fs = require('node:fs');

module.exports = function (env, argv) {
	console.log('env: ', env);
	console.log('argv: ', argv);
	const mode = argv.mode ?? 'development';

	console.log('mode: ', mode);

	const outputJs = `[name]${mode === 'production' ? '.[contenthash:6].min' : ''}.js`;
	const outputCss = `[name]${mode === 'production' ? '.[contenthash:6].min' : ''}.css`;
	return {
		mode: mode,
		entry: {
			index: './src/js/index.js'
		},
		output: {
			clean: true,
			path: path.join(__dirname, 'public'),
			filename: outputJs,
			chunkFilename: (pathData) => {
				// auto-generated ID by Webpack (e.g. "src_js_components_${Component}_js")
				// (The ID is derived from your file path + filename if optimization.chunkIds is set to 'named')
				// If a chunk has an explicit name defined, id will match that name instead of the auto-generated ID.
				let id = pathData.chunk.id;
				let name = null;

				let arr = id.split('_');

				if (arr.length > 1) {
					// grab the ${Component} as a readable name.
					name = arr.at(-2);
				} else {
					// use the explicit name
					name = arr[0];
				}

				return `public/${name}.[contenthash:4].min.js`;
			}
		},
		plugins: [
			new RemoveEmptyScriptsPlugin(),
			new MiniCssExtractPlugin({
				filename: outputCss
			}),
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
					test: /\.m?js$/,
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env']
						}
					}
				},
				{
					test: /sprite\.svg$/,
					type: 'asset/resource',
					generator: {
						filename: '[name].[contenthash:6][ext]'
					}
				},
				{
					test: /\.css$/i,
					use: [
						MiniCssExtractPlugin.loader,
						{ loader: 'css-loader', options: { importLoaders: 1 } },
						'postcss-loader'
					]
				},
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
				}
			]
		},
		optimization: {
			// minimize: true,
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						output: {
							comments: false
						}
					},
					extractComments: false
				}),
				new CssMinimizerPlugin()
			]
		}
	};
};
