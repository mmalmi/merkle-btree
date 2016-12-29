'use strict';

const MerkleBTree = require(`../cjs/MerkleBTree`);
const IPFSStorage = require(`../cjs/IPFSStorage`);
const IpfsLib = require(`ipfs`);

function runTests(testEntryCount, maxChildren, storage) {
  const btree = new MerkleBTree(maxChildren, storage);
  const satoshi = {
    name: `Satoshi Nakamoto`,
    email: `satoshin@gmx.com`,
    website: `bitcoin.org`
  };
  let hash;

  it(`inserts a value and returns a hash`, () => {
    return btree.put(`Satoshi`, satoshi)
      .then(hash => {
        expect(typeof hash).toBe(`string`);
      });
  });

  it(`returns the inserted value`, () => {
    return btree.get(`Satoshi`)
      .then(res => {
        expect(res).toEqual(satoshi);
      });
  });

  it(`returns null when the value is not found`, () => {
    return btree.get(`Hal`)
      .then(res => {
        expect(res).toBeNull();
      });
  });

  it(`can store lots of keys`, () => {
    function iterate(i) {
      //console.log(i);
      if (i <= 0) {
        return;
      }
      return btree.put(`Satoshi ${i}`, Object.assign({}, satoshi, {n: i}))
        .then(function() {
          return iterate(i - 1);
        });
    }
    return iterate(testEntryCount);
    // console.log(btree.print());
  });

  it(`should return tree size`, () => {
    const leafNodeCount = Math.ceil(testEntryCount / (maxChildren - 1)); // leaf nodes have 1 "zero" child
    //const expectedDepth = Math.ceil(Math.log(testEntryCount) / Math.log(maxChildren));

    // TODO: could make a better approximation of tree size
    return btree.size()
      .then(function(size) {
        expect(size).toBeGreaterThanOrEqual(testEntryCount + leafNodeCount);
        //expect(size).toBeLessThanOrEqual(Math.pow(maxChildren, expectedDepth));
      });
  });

  it(`can return the value of all stored keys`, () => {
    function iterate(i) {
      if (i <= 0) {
        return;
      }
      return btree.get(`Satoshi ${i}`)
        .then(function(satoshiN) {
          // console.log(`yess ${i}`);
          expect(satoshiN).toEqual(Object.assign({}, satoshi, {n: i}));
          return iterate(i - 1);
        });
    }
    return iterate(testEntryCount);
  });
}

describe(`merkle-btree`, () => {
  describe(`RAMStorage`, () => {
    const testEntryCount = 10000;
    const maxChildren = 10;
    runTests(testEntryCount, maxChildren);
  });

  describe(`IPFSStorage`, () => {
    const ipfs = new IpfsLib();
    const storage = new IPFSStorage(ipfs);
    const testEntryCount = 200;
    const maxChildren = 10;
    beforeAll((done) => {
      function loadIpfs() {
        ipfs.load(function(err) {
          if (err) { throw err; }
          console.log('IPFS repo was loaded');
          done();
        });
      }

      ipfs._repo.version.exists(function(err, exists) {
        if (err) { throw err; }
        if (exists) {
          loadIpfs();
        } else {
          ipfs.init({ emptyRepo: true, bits: 2048 }, function(err) {
            log('IPFS repo was initialized');
            if (err) { throw err; }
            loadIpfs();
          });
        }
      });
    });

    runTests(testEntryCount, maxChildren, storage);
  });
});
