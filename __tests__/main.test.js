'use strict';

const RAMStorage = require('../cjs/RAMStorage');
const MerkleBTree = require(`../cjs/MerkleBTree`);
const IPFSStorage = require(`../cjs/IPFSStorage`);
const IPFSGatewayStorage = require(`../cjs/IPFSGatewayStorage`);
const IpfsLib = require(`ipfs`);
const ipfs = new IpfsLib();
const expressApp = require('express')();
let rootHash;
const satoshi = {
  name: `Satoshi Nakamoto`,
  email: `satoshin@gmx.com`,
  website: `bitcoin.org`
};

function runTests(testEntryCount, maxChildren, btree) {
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

  it(`can store lots of keys`, () => {
    function iterate(i) {
      //console.log(i);
      if (i <= 0) {
        return;
      }
      return btree.put(`Satoshi ${i}`, Object.assign({}, satoshi, {n: i}))
        .then(function(hash) {
          rootHash = hash;
          return iterate(i - 1);
        });
    }
    return iterate(testEntryCount);
    // console.log(btree.print());
  });

  it(`returns null when the value is not found`, () => {
    return btree.get(`Hal`)
      .then(res => {
        expect(res).toBeNull();
      });
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
          expect(satoshiN).toEqual(Object.assign({}, satoshi, {n: i}));
          return iterate(i - 1);
        });
    }
    return iterate(testEntryCount);
  });

  it(`can searchText by key`, () => {
    return btree.searchText(`Satoshi 1`)
      .then(res => {
        expect(res.length).toBeGreaterThan(testEntryCount / 20);
      });
  });

  it(`can searchText with a cursor`, () => {
    return btree.searchText(`Satoshi 1`, undefined, `Satoshi 1`)
      .then(res => {
        expect(res[0].key).toEqual(`Satoshi 10`);
      });
  });

  it(`can limit searchText result count`, () => {
    return btree.searchText(`Satoshi 1`, 2)
      .then(res => {
        expect(res.length).toEqual(2);
      });
  });

  describe(`searchRange`, () => {
    it(`can search by range`, () => {
      return btree.searchRange(`Satoshi ${testEntryCount / 3}`, `Satoshi ${testEntryCount / 2}`)
        .then(res => {
          expect(res.length).toBeLessThanOrEqual(testEntryCount / 6 + maxChildren * 2);
          expect(res.length).toBeGreaterThan(1);
        });
    });

    it(`can exclude upper & lower bound`, () => {
      return btree.searchRange(`Satoshi ${testEntryCount / 3}`, `Satoshi ${testEntryCount / 2}`, false, false, false)
        .then(res => {
          expect(res.length).toBeLessThanOrEqual(testEntryCount / 6 + maxChildren * 2 - 1);
          expect(res.length).toBeGreaterThan(1);
        });
    });

    it(`returns entryCount - 2 with lower bound 0 and upper bound entryCount`, () => {
      return btree.searchRange(`Satoshi 1`, `Satoshi ${testEntryCount - 1}`, false, false, false)
        .then(res => {
          expect(res.length).toEqual(testEntryCount - 2);
        });
    });

    it(`can be used without upperBound`, () => {
      return btree.searchRange(`Satoshi 1`, undefined, false, false, false)
        .then(res => {
          expect(res.length).toEqual(testEntryCount - 1);
        });
    });

    it(`can be used without lowerBound`, () => {
      return btree.searchRange(undefined, `Satoshi ${testEntryCount - 1}`, false, false, false)
        .then(res => {
          expect(res.length).toEqual(testEntryCount - 1 + 1);
        });
    });
  });
}

describe(`merkle-btree`, () => {
  const ipfsTestEntryCount = 100;
  const ipfsMaxChildren = 10;

  describe(`RAMStorage`, () => {
    const testEntryCount = 1000;
    const maxChildren = 10;
    runTests(testEntryCount, maxChildren, new MerkleBTree(new RAMStorage(), maxChildren));
  });

  describe(`IPFSStorage`, () => {
    const storage = new IPFSStorage(ipfs);

    beforeAll(done => {
      function loadIpfs() {
        ipfs.load(function(err) {
          if (err) { throw err; }
          console.log(`IPFS repo was loaded`);
          done();
        });
      }

      ipfs._repo.version.exists(function(err, exists) {
        if (err) { throw err; }
        if (exists) {
          loadIpfs();
        } else {
          ipfs.init({ emptyRepo: true, bits: 2048 }, function(err) {
            console.log(`IPFS repo was initialized`);
            if (err) { throw err; }
            loadIpfs();
          });
        }
      });
    });

    runTests(ipfsTestEntryCount, ipfsMaxChildren, new MerkleBTree(storage, ipfsMaxChildren));
  });

  describe(`IPFSGatewayStorage`, () => {
    let btree, server;
    const storage = new IPFSGatewayStorage('http://localhost:8080');

    beforeAll(done => {
      // Set up ipfs file gateway
      expressApp.get('/ipfs/:hash', function(req, res) {
        ipfs.files.cat(req.params.hash)
        .then(function(stream) {
          stream.pipe(res);
        })
        .catch(function(e) {
          res.status(404).json("not found");
        });
      });
      server = expressApp.listen(8080, 'localhost');
      return MerkleBTree.getByHash(rootHash, storage).then(res => {
        btree = res;
        done();
      });
    });

    it(`supports also /ipfs/:hash format in get`, () => {
      return MerkleBTree.getByHash(`/ipfs/${rootHash}`, storage).then(res => {
        expect(res).toEqual(btree);
      });
    });

    it(`returns null when the value is not found`, () => {
      return btree.get(`Hal`)
        .then(res => {
          expect(res).toBeNull();
        });
    });

    it(`should return tree size`, () => {
      const leafNodeCount = Math.ceil(ipfsTestEntryCount / (ipfsMaxChildren - 1)); // leaf nodes have 1 "zero" child
      //const expectedDepth = Math.ceil(Math.log(testEntryCount) / Math.log(maxChildren));

      // TODO: could make a better approximation of tree size
      return btree.size()
        .then(function(size) {
          expect(size).toBeGreaterThanOrEqual(ipfsTestEntryCount + leafNodeCount);
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
            expect(satoshiN).toEqual(Object.assign({}, satoshi, {n: i}));
            return iterate(i - 1);
          });
      }
      return iterate(ipfsTestEntryCount);
    });

    afterAll(() => {
      server.close();
    });
  });
});
