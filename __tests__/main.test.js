const MerkleBTree = require(`../cjs/MerkleBTree`);

describe(`merkle-btree`, () => {
  const testEntryCount = 200;
  const maxChildren = 13;
  const btree = new MerkleBTree(maxChildren);
  const satoshi = {
    name: `Satoshi Nakamoto`,
    email: `satoshin@gmx.com`,
    website: `bitcoin.org`
  };
  let hash;

  it(`inserts a value and returns a hash`, () => {
    hash = btree.put(`Satoshi`, satoshi);
    expect(typeof hash).toBe(`string`);
  });

  it(`returns the inserted value`, () => {
    const satoshi2 = btree.get(`Satoshi`);
    expect(satoshi2).toEqual(satoshi);
  });

  it(`returns null when the value is not found`, () => {
    expect(btree.get(`Hal`)).toBeNull();
  });

  it(`can store lots of keys`, () => {
    for (let i = 0; i < testEntryCount; i++) {
      let sizeBefore = btree.size();
      btree.put(`Satoshi ${i}`, Object.assign({}, satoshi, {n: i}));
      let sizeAfter = btree.size();
      expect(sizeAfter).toBeGreaterThan(sizeBefore);
    }
    // console.log(btree.print());
  });

  it(`should return tree size`, () => {
    const size = btree.size();
    const leafNodeCount = Math.ceil(testEntryCount / (maxChildren - 1)); // leaf nodes have 1 "zero" child
    //const expectedDepth = Math.ceil(Math.log(testEntryCount) / Math.log(maxChildren));

    // TODO: could make a better approximation of tree size
    expect(size).toBeGreaterThanOrEqual(leafNodeCount + leafNodeCount * (maxChildren - 1) / 2);
    //expect(size).toBeLessThanOrEqual(Math.pow(maxChildren, expectedDepth));
  });

  it(`can return the value of all stored keys`, () => {
    for (let i = 0; i < testEntryCount; i++) {
      const satoshiN = btree.get(`Satoshi ${i}`);
      expect(satoshiN).toEqual(Object.assign({}, satoshi, {n: i}));
    }
  });
});
