import type {PluginOption, HtmlTagDescriptor, ResolvedConfig} from 'vite';
import path from 'path';
import fs from 'fs';

const GHOST_ADMIN_PATH = path.resolve(__dirname, '../../ghost/core/core/built/admin');

function isAbsoluteUrl(url: string): boolean {
    return url.startsWith('http://') ||
           url.startsWith('https://') ||
           url.startsWith('/');
}

function prefixUrl(url: string, base: string): string {
    if (isAbsoluteUrl(url)) return url;
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${normalizedBase}/${url}`;
}

// Vite plugin to extract styles and scripts from Ghost admin index.html
export function emberAssetsPlugin() {
    let config: ResolvedConfig;

    return {
        name: 'ember-assets',
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },
        transformIndexHtml: {
            order: 'post',
            handler() {
                // Path to the Ghost admin index.html file
                const indexPath = path.resolve(GHOST_ADMIN_PATH, 'index.html');
                try {
                    const indexContent = fs.readFileSync(indexPath, 'utf-8');
                    const base = config.base || '/';
                    
                    // Extract stylesheets
                    const styleRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"[^>]*>/g;
                    const styles: HtmlTagDescriptor[] = [];
                    let styleMatch;
                    while ((styleMatch = styleRegex.exec(indexContent)) !== null) {
                        styles.push({
                            tag: 'link',
                            attrs: {
                                rel: 'stylesheet',
                                href: prefixUrl(styleMatch[1], base)
                            }
                        });
                    }
                    // Extract scripts
                    const scriptRegex = /<script[^>]*src="([^"]*)"[^>]*><\/script>/g;
                    const scripts: HtmlTagDescriptor[] = [];
                    let scriptMatch;
                    while ((scriptMatch = scriptRegex.exec(indexContent)) !== null) {
                        scripts.push({
                            tag: 'script',
                            injectTo: 'body',
                            attrs: {
                                src: prefixUrl(scriptMatch[1], base)
                            }
                        });
                    }

                    // Extract meta tags
                    const metaRegex = /<meta name="ghost-admin\/config\/environment" content="([^"]*)"[^>]*>/g;
                    const metaTags: HtmlTagDescriptor[] = [];
                    let metaMatch;
                    while ((metaMatch = metaRegex.exec(indexContent)) !== null) {
                        metaTags.push({
                            tag: 'meta',
                            attrs: {
                                name: 'ghost-admin/config/environment',
                                content: metaMatch[1]
                            }
                        });
                    }

                    // Generate the virtual module content
                    return [...styles, ...scripts, ...metaTags];
                } catch (error) {
                    console.warn('Failed to read Ghost admin index.html:', error);
                    return;
                }
            }
        },
        closeBundle() {
            // Only copy assets during production builds
            if (config.command === 'build') {
                const sourcePath = path.resolve(GHOST_ADMIN_PATH, 'assets');
                const destPath = path.resolve(config.build.outDir, 'assets');

                try {
                    // Copy all ember assets to the build output directory
                    fs.cpSync(sourcePath, destPath, { recursive: true });
                    console.log('Copied ember assets to build output');
                } catch (error) {
                    throw new Error(`Failed to copy ember assets: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    } as const satisfies PluginOption;
}
