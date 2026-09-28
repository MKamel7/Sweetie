// Bundles tlock-js for the browser: node scripts/build-tlock.mjs
import { build } from 'esbuild';

await build({
  entryPoints: [new URL('./tlock-entry.js', import.meta.url).pathname],
  outfile: new URL('../js/vendor/tlock.js', import.meta.url).pathname,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
  define: { global: 'globalThis' },
});
console.log('js/vendor/tlock.js built');
