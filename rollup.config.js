import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import bundleSize from 'rollup-plugin-bundle-size';
import commonjs from 'rollup-plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';

const name = `merkleBtree`;

const includePathOptions = {
    include: {},
    paths: ['src'],
    external: [],
    extensions: ['.js']
};

const plugins = [
  babel(),
  nodeResolve({
    module: true,
    jsnext: true
  }),
  commonjs({
    include: `node_modules/**`
  }),
  bundleSize(),
  includePaths(includePathOptions)
];

const isProd = process.env.NODE_ENV === `production`;
if (isProd) plugins.push(uglify());

export default {
  entry: `src/index.js`,
  plugins,
  dest: `dist/${name}${isProd ? `.min` : ``}.js`,
  moduleName: name,
  format: `umd`
};
