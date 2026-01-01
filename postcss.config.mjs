import wordpressPreset from '@wordpress/postcss-plugins-preset';

export default {
	plugins: {
		...wordpressPreset.plugins,
		'@tailwindcss/postcss': {}
	}
};
