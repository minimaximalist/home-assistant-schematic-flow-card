import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'node:fs';

const dev = process.env.ROLLUP_WATCH === 'true';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * Tiny inline plugin: rewrites the `__CARD_VERSION__` token in source with
 * the version from package.json. Keeps the runtime banner in sync with
 * the published version without adding a dependency.
 */
const injectVersion = () => ({
  name: 'inject-version',
  transform(code, id) {
    if (!id.endsWith('schematic-flow-card.ts')) return null;
    if (!code.includes('__CARD_VERSION__')) return null;
    return {
      code: code.replace(/__CARD_VERSION__/g, pkg.version),
      map: null,
    };
  },
});

export default {
  input: 'src/schematic-flow-card.ts',
  output: {
    file: 'dist/schematic-flow-card.js',
    format: 'es',
    sourcemap: dev,
    banner: `/*! schematic-flow-card v${pkg.version} — MIT licensed */`,
  },
  plugins: [
    injectVersion(),
    resolve(),
    typescript({ tsconfig: './tsconfig.json', exclude: ['test/**/*'] }),
    !dev && terser({ format: { comments: /^\!/ } }),
  ].filter(Boolean),
};
