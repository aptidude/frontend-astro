// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    output: 'static',
    site: 'https://aptidude.in',
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
