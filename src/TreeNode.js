import promises from 'es6-promise';
promises.polyfill();

class KeyElement {
  constructor(key, valueHash, targetHash) {
    this.key = key;
    this.valueHash = valueHash;
    this.targetHash = targetHash;
  }
}

class TreeNode {
  constructor(leftChildHash, keys = [], hash) {
    this.hash = hash;
    this.leftChildHash = leftChildHash;
    this.keys = keys;
    const zero = new KeyElement(``, null, leftChildHash);
    if (!this.keys.length || this.keys[0].key.length) {
      this.keys.unshift(zero);
    }
  }

  get(key, storage) {
    let nextKey = this.keys[0];
    for (const k of this.keys) {
      if (key < k.key) {
        break;
      }
      nextKey = k;
    }
    if (nextKey.targetHash) {
      return storage.get(nextKey.targetHash)
        .then(serialized => {
          return TreeNode.deserialize(serialized, nextKey.targetHash).get(key, storage);
        });
    }
    if (nextKey.key === key) {
      return Promise.resolve(nextKey.valueHash);
    }
    return Promise.resolve(null); // not found
  }

  _getLeafInsertIndex(key) {
    const {index, exists} = this._getNextSmallestIndex(key);
    let leafInsertIndex = index + 1;
    if (key > this.keys[this.keys.length - 1].key) {
      leafInsertIndex = this.keys.length;
    }
    return {leafInsertIndex, exists};
  }

  _getNextSmallestIndex(key) {
    let index = 0, exists;
    for (let i = 1;i < this.keys.length;i ++) {
      if (key === this.keys[i].key) {
        exists = true;
        break;
      }
      if (key < this.keys[i].key) {
        break;
      }
      index = i;
    }
    return {index, exists};
  }

  _splitNode(storage) {
    const medianIndex = Math.floor(this.keys.length / 2);
    const median = this.keys[medianIndex];
    const leftChild = new TreeNode(null, this.keys.slice(0, medianIndex));
    const putLeftChild = storage.put(leftChild.serialize());

    const rightSet = this.keys.slice(medianIndex, this.keys.length);
    if (this.keys[0].targetHash) { // branch node
      rightSet.shift();
    }
    const rightChild = new TreeNode(this.keys[medianIndex].targetHash, rightSet);
    const putRightChild = storage.put(rightChild.serialize());

    const remove = storage.remove(this.hash);
    return Promise.all([putLeftChild, putRightChild, remove])
      .then(([leftChildHash, rightChildHash]) => {
        const rightChildElement = new KeyElement(median.key, null, rightChildHash);
        return new TreeNode(leftChildHash, [rightChildElement]);
      });
  }

  _saveToLeafNode(key, value, storage, maxChildren) {
    const keyElement = new KeyElement(key, value, null);
    const {leafInsertIndex, exists} = this._getLeafInsertIndex(key);
    if (exists) {
      this.keys[leafInsertIndex] = keyElement;
      return storage.remove(this.hash)
        .then(() => {
          return storage.put(this.serialize());
        })
        .then(hash => {
          return new TreeNode(this.leftChildHash, this.keys, hash);
        });
    }

    this.keys.splice(leafInsertIndex, 0, keyElement);
    if (this.keys.length < maxChildren) {
      return storage.remove(this.hash)
        .then(() => {
          return storage.put(this.serialize());
        })
        .then(hash => {
          return new TreeNode(this.leftChildHash, this.keys, hash);
        });
    }
    return this._splitNode(storage);
  }

  _saveToBranchNode(key, value, storage, maxChildren) {
    const {index} = this._getNextSmallestIndex(key);
    const nextSmallest = this.keys[index];
    return storage.get(nextSmallest.targetHash)
      .then(serialized => {
        return TreeNode.deserialize(serialized, nextSmallest.targetHash).put(key, value, storage, maxChildren);
      })
      .then(modifiedChild => {
        if (!modifiedChild.hash) {
          // we split a child and need to add the median to our keys
          this.keys[index] = new KeyElement(nextSmallest.key, null, modifiedChild.keys[0].targetHash);
          this.keys.splice(index + 1, 0, modifiedChild.keys[modifiedChild.keys.length - 1]);

          if (this.keys.length < maxChildren) {
            storage.remove(this.hash);
            return storage.put(this.serialize()).then(hash => {
              return new TreeNode(this.leftChildHash, this.keys, hash);
            });
          }
          return this._splitNode(storage);
        }
        // The child element was not split
        this.keys[index] = new KeyElement(this.keys[index].key, null, modifiedChild.hash);
        storage.remove(this.hash);
        return storage.put(this.serialize()).then(hash => {
          return new TreeNode(this.leftChildHash, this.keys, hash);
        });
      });
  }

  put(key, value, storage, maxChildren): TreeNode {
    if (!this.keys[0].targetHash) {
      return this._saveToLeafNode(key, value, storage, maxChildren);
    }
    return this._saveToBranchNode(key, value, storage, maxChildren);
  }

  delete(key, storage) {
    storage.remove(key);
    for (let i = 0;i < this.keys.length;i ++) {
      if (this.keys[i].key === key) {
        this.keys.splice(i, 1);
      }
    }
    const hash = storage.put(this.serialize());
    return new TreeNode(this.leftChildHash, this.keys, hash);
  }

  size(storage) {
    return this.keys.reduce((promise, key) => {
      return promise.then(size => {
        if (key.targetHash) {
          return storage.get(key.targetHash)
            .then(serialized => {
              return TreeNode.deserialize(serialized).size(storage);
            })
            .then(childSize => { return childSize + size; });
        }
        return size;
      });
    }, Promise.resolve(this.keys.length));
  }

  smallestKey() {
    if (this.keys.length) {
      return this.keys[0];
    }
    return null;
  }

  smallestNonZeroKey() {
    if (this.keys.length > 1) {
      return this.keys[1];
    }
    return null;
  }

  rebalance() {

  }

  print(storage, lvl = 0) {
    let str = `node: ${this.hash}\n`;
    let indentation = ``;
    for (let i = 0;i <= lvl;i ++) {indentation += `- `;}
    this.keys.forEach(key => {
      str += indentation;
      str += `key: ${key.key}`;
      if (key.targetHash) {
        str += ` link: ${key.targetHash}`;
      }
      if (key.valueHash) {
        str += `\n${indentation}   value: ${JSON.stringify(key.valueHash)}`;
      }
      str += `\n`;
    });
    this.keys.forEach(key => {
      if (key.targetHash) {
        const child = TreeNode.deserialize(storage.get(key.targetHash), key.targetHash);
        str += `\n`;
        str += indentation;
        str += child.print(storage, lvl + 1);
      }
    });
    return str;
  }

  serialize() {
    return JSON.stringify({leftChildHash: this.leftChildHash, keys: this.keys});
  }

  static deserialize(data, hash) {
    data = JSON.parse(data);
    return new TreeNode(data.leftChildHash, data.keys, hash);
  }
}

export default TreeNode;
