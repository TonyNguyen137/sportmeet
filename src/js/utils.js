import path from 'path';
import { fileURLToPath } from 'url';

export function dirname(metaUrl) {
	return path.dirname(fileURLToPath(metaUrl));
}
