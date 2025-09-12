import type {PluginOption, HtmlTagDescriptor} from 'vite';
import path from 'path';
import fs from 'fs';

// Vite plugin to extract styles and scripts from Ghost admin index.html
export function emberAssetsPlugin() {
    return {
        name: 'ember-assets',
        transformIndexHtml: {
            order: 'post',
            handler() {
                // Path to the Ghost admin index.html file
                const indexPath = path.resolve(__dirname, '../../ghost/admin/dist/index.html');
                try {
                    const indexContent = fs.readFileSync(indexPath, 'utf-8');
                    // Extract stylesheets
                    const styleRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"[^>]*>/g;
                    const styles: HtmlTagDescriptor[] = [];
                    let styleMatch;
                    while ((styleMatch = styleRegex.exec(indexContent)) !== null) {
                        styles.push({
                            tag: 'link',
                            attrs: {
                                rel: 'stylesheet',
                                href: '/ghost/' + styleMatch[1]
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
                                src: '/ghost/' + scriptMatch[1].replace(/^\/ghost\//, '')
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
        }
    } as const satisfies PluginOption;
}
