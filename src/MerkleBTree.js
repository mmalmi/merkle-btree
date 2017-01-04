import TreeNode from './TreeNode';
import RAMStorage from './RAMStorage';

class MerkleBTree {
  constructor(storage = new RAMStorage(), maxChildren = 10, rootNode = new TreeNode()) {
    this.rootNode = rootNode;
    this.storage = storage;
    this.maxChildren = Math.max(maxChildren, 2);
  }

  get(key) {
    return this.rootNode.get(key, this.storage);
  }

  search(query, limit) {
    return this.rootNode.search(query, limit, this.storage);
  }

  put(key, value) {
    return this.rootNode.put(key, value, this.storage, this.maxChildren)
      .then(newRoot => {
        this.rootNode = newRoot;
        return this.storage.put(newRoot.serialize());
      })
      .then(newHash => {
        this.rootNode = new TreeNode(this.rootNode.leftChildHash, this.rootNode.keys, newHash);
        return newHash;
      });
  }

  delete(key) {
    return this.rootNode.delete(key, this.storage, this.maxChildren)
      .then(newRoot => {
        this.rootNode = newRoot;
        return newRoot.hash;
      });
  }

  print() {
    return this.rootNode.print(this.storage);
  }

  /* Return number of keys stored in tree */
  size() {
    return this.rootNode.size(this.storage);
  }

  static getByHash(hash, storage, maxChildren) {
    // TODO: guess maxChildren from tree?
    return storage.get(hash).then(data => {
      const rootNode = TreeNode.deserialize(data);
      return new MerkleBTree(storage, maxChildren, rootNode);
    });
  }
}

export default MerkleBTree;
