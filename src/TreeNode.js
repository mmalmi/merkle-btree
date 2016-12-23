class KeyElement {
  constructor(key, valueHash, targetHash) {
    this.key = key;
    this.valueHash = valueHash;
    this.targetHash = targetHash;
  }

  equals(el2) {
    return this.key === el2.key && this.valueHash === el2.valueHash && this.targetHash === el2.targetHash;
  }
}

class TreeNode {
  constructor(leftChildHash, keys = [], hash) {
    this.hash = hash;
    this.leftChildHash = leftChildHash;
    this.keys = keys.sort((a, b) => a.key.localeCompare(b.key));
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
      return TreeNode.deserialize(storage.get(nextKey.targetHash), nextKey.targetHash).get(key, storage);
    }
    if (nextKey.key === key) {
      return nextKey.valueHash;
    }
    return null; // not found
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
    const leftChildHash = storage.put(leftChild.serialize());

    const rightSet = this.keys.slice(medianIndex, this.keys.length);
    if (this.keys[0].targetHash) { // branch node
      rightSet.shift();
    }
    const rightChild = new TreeNode(this.keys[medianIndex].targetHash, rightSet);
    const rightChildHash = storage.put(rightChild.serialize());
    const rightChildElement = new KeyElement(median.key, null, rightChildHash);

    return new TreeNode(leftChildHash, [rightChildElement]);
  }

  _saveToLeafNode(key, value, storage, maxChildren) {
    const keyElement = new KeyElement(key, value, null);
    const {leafInsertIndex, exists} = this._getLeafInsertIndex(key);
    if (exists) {
      this.keys[leafInsertIndex] = keyElement;
      const hash = storage.put(this.serialize());
      return new TreeNode(this.leftChildHash, this.keys, hash);
    }

    this.keys.splice(leafInsertIndex, 0, keyElement);
    if (this.keys.length < maxChildren) {
      // Add the value and commit this node to storage
      const hash = storage.put(this.serialize());
      return new TreeNode(this.leftChildHash, this.keys, hash);
    }
    return this._splitNode(storage);
  }

  _saveToBranchNode(key, value, storage, maxChildren) {
    const {index} = this._getNextSmallestIndex(key);
    const nextSmallest = this.keys[index];
    const modifiedChild = TreeNode.deserialize(storage.get(nextSmallest.targetHash), nextSmallest.targetHash)
      .put(key, value, storage, maxChildren);

    if (!modifiedChild.hash) {
      // we split a child and need to add the median to our keys
      this.keys[index] = new KeyElement(nextSmallest.key, null, modifiedChild.keys[0].targetHash);
      this.keys.push(modifiedChild.keys[modifiedChild.keys.length - 1]);
      this.keys = this.keys.sort((a, b) => a.key.localeCompare(b.key));

      if (this.keys.length < maxChildren) {
        const hash = storage.put(this.serialize());
        return new TreeNode(this.leftChildHash, this.keys, hash);
      }
      return this._splitNode(storage);
    }
    // The child element was not split
    this.keys[index] = new KeyElement(this.keys[index].key, null, modifiedChild.hash);
    const hash = storage.put(this.serialize());
    return new TreeNode(this.leftChildHash, this.keys, hash);
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
    let total = 0;
    this.keys.forEach(key => {
      if (key.targetHash) {
        total += TreeNode.deserialize(storage.get(key.targetHash)).size(storage);      }
    });
    total += this.keys.length;
    return total;
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
