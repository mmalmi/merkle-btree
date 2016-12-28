import TreeNode from './TreeNode';
import RAMStorage from './RAMStorage';

class MerkleBTree {
  constructor(maxChildren = 10, storage = new RAMStorage(), rootNode = new TreeNode()) {
    this.rootNode = rootNode;
    this.storage = storage;
    this.maxChildren = Math.max(maxChildren, 2);
  }

  get(key) {
    return this.rootNode.get(key, this.storage);
  }

  put(key, value) {
    const newRoot = this.rootNode.put(key, value, this.storage, this.maxChildren);
    const newHash = this.storage.put(newRoot.serialize());
    this.rootNode = new TreeNode(newRoot.leftChildHash, newRoot.keys, newHash);
    return this.rootNode.hash;
  }

  delete(key) {
    this.rootNode = this.rootNode.delete(key, this.storage, this.maxChildren);
    return this.rootNode.hash;
  }

  print() {
    return this.rootNode.print(this.storage);
  }

  /* Return number of keys stored in tree */
  size() {
    return this.rootNode.size(this.storage);
  }
}

export default MerkleBTree;
