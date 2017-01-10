# merkle-btree

> Content-addressed b-tree

[![NPM](https://img.shields.io/npm/v/merkle-btree.svg?style=flat-square)](https://www.npmjs.com/package/merkle-btree)
[![David](https://img.shields.io/david/mmalmi/merkle-btree.svg?style=flat-square)](https://david-dm.org/mmalmi/merkle-btree)
[![Travis](https://img.shields.io/travis/mmalmi/merkle-btree/master.svg?style=flat-square)](https://travis-ci.org/mmalmi/merkle-btree)

### Description
Generic javascript library for writing and reading B-trees on content hash addressed storages. Includes storage adapters for [IPFS](https://ipfs.io/) nodes (read & write) and gateways (read only).

Based on https://github.com/ianopolous/merkle-btree.

### Installation

Install via [yarn](https://github.com/yarnpkg/yarn)

	yarn add merkle-btree (--dev)

or npm

	npm install merkle-btree (--save-dev)


If you don't use a package manager, you can [access `merkle-btree` via unpkg (CDN)](https://unpkg.com/merkle-btree/), download the source, or point your package manager to the url.

`merkle-btree` is compiled as a collection of [CommonJS](http://webpack.github.io/docs/commonjs.html) modules & [ES2015 modules](http://www.2ality.com/2014/09/es6-modules-final.html) for bundlers that support the `jsnext:main` or `module` field in package.json (Rollup, Webpack 2)

The `merkle-btree` package includes precompiled production and development [UMD](https://github.com/umdjs/umd) builds in the [`dist` folder](https://unpkg.com/merkle-btree/dist/). They can be used directly without a bundler and are thus compatible with many popular JavaScript module loaders and environments. You can drop a UMD build as a [`<script>` tag](https://unpkg.com/merkle-btree) on your page. The UMD builds make `merkle-btree` available as a `window.merkleBtree` global variable.

### Usage

```js

var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var lib = require('merkle-btree');

// Store entries into a merkle tree on IPFS
var storage = new lib.IPFSStorage(ipfs);
var tree = new lib.MerkleBTree(storage);
tree.put('key', 'value').then(console.log); // outputs tree IPFS file hash after inserting key
tree.get('key').then(console.log); // 'value'
tree.search('k').then(console.log); // [ { key: 'key', value: 'value' } ]

// Read-only storage using an IPFS gateway - good for serverless browser apps
var storage2 = new lib.IPFSGatewayStorage('https://identi.fi');
lib.MerkleBTree.getByHash('QmWXBTuicL68jxutngJhFjAW7obuS38Yi8H3bNNHUnrB1V/identities')
.then(function(tree2) {
  return tree2.get('sirius@iki.fi');
})
.then(console.log);

```

### configuration

You can pass in extra options as a configuration object (➕ required, ➖ optional, ✏️ default).

```js

import merkleBtree from 'merkle-btree';

```

➖ **property** ( type ) ` ✏️ default `
<br/> 📝 description
<br/> ❗️ warning
<br/> ℹ️ info
<br/> 💡 example

### methods

#### #name

```js

merkleBtree

```

### Examples

See [`example`](example) folder or the [runkit](https://runkit.com/mmalmi/merkle-btree) example.

### License

The code is available under the [MIT](LICENSE) license.

### Contributing

We are open to contributions, see [CONTRIBUTING.md](CONTRIBUTING.md) for more info.

### Misc

This module was created using [generator-module-boilerplate](https://github.com/duivvv/generator-module-boilerplate).
