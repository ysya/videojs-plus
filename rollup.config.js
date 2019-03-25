import fs from 'fs';
import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import scss from 'rollup-plugin-scss';
import json from 'rollup-plugin-json';
import kebabCase from 'lodash/kebabCase';

function createEntry(input, output, css) {
  return {
    input,
    output,
    // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
    external: ['video.js'],
    plugins: [
      // Allow json resolution
      json(),
      // Compile TypeScript files
      // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
      commonjs(),
      // Allow node_modules resolution, so you can use 'external' to control
      // which external modules to include in the bundle
      // https://github.com/rollup/rollup-plugin-node-resolve#usage
      resolve(),
      babel({
        babelrc: true,
        exclude: 'node_modules/**',
        compact: false
      }),

      // Resolve source maps to the original source
      sourceMaps(),
      scss({
        output: styles => {
          if (styles && styles.length) {
            const cssOutput = css || output[0].file.replace(/\.(umd|es|iife).js/, '.css');
            mkdirp(cssOutput.replace(/[^\/]*$/, ''));
            fs.writeFileSync(cssOutput, styles);
          }
        }
      })
    ]
  };
}

const pluginsDir = 'source/Plugin';
const output = setFileName =>
  ['umd', 'es'].map(format => {
    return {
      file: setFileName(format),
      format,
      sourcemap: true,
      globals: {
        'video.js': 'videojs'
      }
    };
  });

export default [
  createEntry('source/index.js', output(format => `dist/videojs-plus.${format}.js`)),
  ...fs.readdirSync(pluginsDir).map(pluginName => {
    const kebabCaseName = kebabCase(pluginName);
    const outdir = `dist/plugins/${kebabCaseName}`;
    return createEntry(
      `${pluginsDir}/${pluginName}/${pluginName}.js`,
      output(format => {
        const name = format === 'umd' ? 'index' : `${kebabCaseName}.${format}`;
        return `${outdir}/${name}.js`;
      }),
      `${outdir}/style.css`
    );
  })
];

function mkdirp(dir) {
  return path
    .resolve(dir)
    .split(path.sep)
    .reduce((acc, cur) => {
      const currentPath = path.normalize(acc + path.sep + cur);

      try {
        fs.statSync(currentPath);
      } catch (e) {
        if (e.code === 'ENOENT') {
          fs.mkdirSync(currentPath);
        } else {
          throw e;
        }
      }
      return currentPath;
    }, '');
}
