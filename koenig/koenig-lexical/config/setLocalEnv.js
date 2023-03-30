import fs from 'fs';
import path from 'path';

export function setLocalEnv(configName = 'cardConfig.json', group = 'VITE_CARD_CONFIG') {
    const filePath = path.relative(process.cwd(), path.resolve(process.cwd(), configName));

    if (fs.existsSync(filePath)) {
        const configJson = fs.readFileSync(filePath);
        process.env = Object.assign(process.env, {[group]: configJson});
    }
}
