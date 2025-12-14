// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    output: 'static',
    site: 'https://aptidude.in',
    integrations: [
        sitemap({
            // Filter out pages that shouldn't be in sitemap
            filter: (page) => 
                !page.includes('/app/') &&
                !page.includes('/admin/') &&
                !page.includes('/profile/') &&
                !page.includes('/auth/') &&
                !page.includes('/login') &&
                !page.includes('/signup'),
            // Change frequency hints for crawlers
            changefreq: 'weekly',
            // Priority hints (0.0 to 1.0)
            priority: 0.7,
            // Last modified date
            lastmod: new Date(),
        })
    ],
    build: {
        format: 'directory',
        inlineStylesheets: 'auto'
    },
    vite: {
        build: {
            cssCodeSplit: true,
            minify: 'esbuild',
            // Drop console.log in production (esbuild option)
            target: 'es2020'
        },
        esbuild: {
            drop: ['console', 'debugger']
        }
    },
    compressHTML: true,
    prefetch: {
        prefetchAll: false,
        defaultStrategy: 'hover'
    }
});
