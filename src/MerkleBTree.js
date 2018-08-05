import TreeNode from './TreeNode';

class MerkleBTree {
  constructor(storage, maxChildren = 10, rootNode = new TreeNode()) {
    this.rootNode = rootNode;
    this.storage = storage;
    this.maxChildren = Math.max(maxChildren, 2);
  }

  get(key) {
    return this.rootNode.get(key, this.storage);
  }

  searchText(query, limit, cursor, reverse = false) {
    return this.rootNode.searchText(query, limit, cursor, reverse, this.storage);
  }

  searchRange(lowerBound, upperBound, limit, includeLowerBound = true, includeUpperBound = true, reverse = false) {
    return this.rootNode.searchRange(lowerBound, upperBound, false, limit, includeLowerBound, includeUpperBound, reverse, this.storage);
  }

  put(key, value) {
    return this.rootNode.put(key, value, this.storage, this.maxChildren)
      .then(newRoot => {
        this.rootNode = newRoot;
        return this.rootNode.hash;
      });
  }

  delete(key) {
    return this.rootNode.delete(key, this.storage, this.maxChildren)
      .then(newRoot => {
        this.rootNode = newRoot;
        return this.rootNode.hash;
      });
  }

  print() {
    return this.rootNode.print(this.storage);
  }

  /* Return number of keys stored in tree */
  size() {
    return this.rootNode.size(this.storage);
  }

  toSortedList() {
    return this.rootNode.toSortedList(this.storage);
  }

  save() {
    return this.rootNode.save(this.storage);
  }

  static getByHash(hash, storage, maxChildren) {
    return storage.get(hash).then(data => {
      const rootNode = TreeNode.deserialize(data);
      return new MerkleBTree(storage, maxChildren, rootNode);
    });
  }

  static fromSortedList(list, maxChildren, storage) {
    return TreeNode.fromSortedList(list, maxChildren, storage)
      .then(rootNode => {
        return new MerkleBTree(storage, maxChildren, rootNode);
      });
  }
}

export default MerkleBTree;
