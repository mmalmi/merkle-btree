function lt(a, b) {
  return a < b;
}

function lte(a, b) {
  return a <= b;
}

function gt(a, b) {
  return a > b;
}

function gte(a, b) {
  return a >= b;
}

function any() {
  return true;
}

function beginsWith(str, begin) {
  return str.substring(0, begin.length) === begin;
}

class KeyElement {
  constructor(key, value, targetHash) {
    this.key = key;
    this.value = value;
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
      return Promise.resolve(nextKey.value);
    }
    return Promise.resolve(null); // not found
  }

  searchText(query, limit = 100, cursor, reverse, storage) {
    let lowerBound = cursor || query;
    let upperBound = undefined;
    let includeLowerBound = !cursor;
    let includeUpperBound = true;
    if (reverse) {
      lowerBound = query;
      upperBound = cursor || undefined;
      includeLowerBound = true;
      includeUpperBound = !cursor;
    }
    return this.searchRange(lowerBound, upperBound, query, limit, includeLowerBound, includeUpperBound, reverse, storage);
  }

  searchRange(lowerBound, upperBound, queryText, limit, includeLowerBound = true, includeUpperBound = true, reverse, storage) {
    let matches = [];
    const _this = this;

    let lowerBoundCheck, upperBoundCheck;
    if (lowerBound) {
      lowerBoundCheck = includeLowerBound ? gte : gt;
    } else {
      lowerBoundCheck = any;
    }
    if (upperBound) {
      upperBoundCheck = includeUpperBound ? lte : lt;
    } else {
      upperBoundCheck = any;
    }

    function iterate(i) {
      if (i < 0 || i >= _this.keys.length) {
        return Promise.resolve(matches);
      }
      if (limit && matches.length >= limit) {
        matches = matches.slice(0, limit + 1);
        return Promise.resolve(matches);
      }

      const next = reverse ? i - 1 : i + 1;
      const k = _this.keys[i];
      if (next >= 0 && next < _this.keys.length) {
        if (!reverse && lowerBound >= _this.keys[next].key) { // search only nodes whose keys are in the query range
          return iterate(next);
        }
        if (reverse && upperBound < _this.keys[next].key) { // search only nodes whose keys are in the query range
          return iterate(next);
        }
      }
      // return if search range upper / lower bound was passed
      if (reverse && i + 1 < _this.keys.length && !lowerBoundCheck(_this.keys[i + 1].key, lowerBound)) {
        return Promise.resolve(matches);
      }
      if (!reverse && !upperBoundCheck(k.key, upperBound)) {
        return Promise.resolve(matches);
      }
      if (k.targetHash) { // branch node
        return storage.get(k.targetHash)
          .then(serialized => {
            const newLimit = limit ? (limit - matches.length) : undefined;
            return TreeNode.deserialize(serialized, k.targetHash).searchRange(lowerBound, upperBound, queryText, newLimit, includeLowerBound, includeUpperBound, reverse, storage);
          })
          .then(m => {
            if (m) {
              if (matches.length && !m.length) {
                return Promise.resolve(matches); // matches were previously found but now we're out of range
              }
              Array.prototype.push.apply(matches, m);
            }
            return iterate(next);
          });
      }
      // leaf node
      if (k.key.length && k.value) {
        if (queryText && matches.length && !beginsWith(k.key, queryText)) {
          return Promise.resolve(matches); // matches were previously found but now we're out of range
        }
        if (lowerBoundCheck(k.key, lowerBound) && upperBoundCheck(k.key, upperBound)) { // leaf node with matching key
          if (!queryText || beginsWith(k.key, queryText)) {
            matches.push({key: k.key, value: k.value});
          }
        }
      }
      return iterate(next);
    }

    return iterate(reverse ? this.keys.length - 1 : 0);
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
    let nextKey = this.keys[0];
    let i;
    for (i = 0;i < this.keys.length;i ++) {
      if (key < this.keys[i].key) {
        i = Math.max(i - 1, 0);
        break;
      }
      nextKey = this.keys[i];
    }
    let q = Promise.resolve();
    if (nextKey.targetHash) {
      q = q.then(() => {
        return storage.get(nextKey.targetHash)
          .then(serialized => {
            return TreeNode.deserialize(serialized, nextKey.targetHash).delete(key, storage);
          })
          .then(newNode => {
            const oldHash = this.keys[i].targetHash;
            this.keys[i].targetHash = newNode.hash;
            return storage.remove(oldHash);
          });
      });
    }
    else if (nextKey.key === key) {
      this.keys.splice(i, 1);
    }
    return q.then(() => {
      return storage.put(this.serialize());
    })
    .then(hash => {
      return new TreeNode(this.leftChildHash, this.keys, hash);
    });
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
      if (key.value) {
        str += `\n${indentation}   value: ${JSON.stringify(key.value)}`;
      }
      str += `\n`;
    });
    this.keys.forEach(key => {
      if (key.targetHash) {
        storage.get(key.targetHash).then(serialized => {
          const child = TreeNode.deserialize(serialized, key.targetHash);
          str += `\n`;
          str += indentation;
          str += child.print(storage, lvl + 1);
        });
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

  /*
    Create a tree from a [{key,value,targetHash}, ...] list sorted in ascending order by k.
    targetHash must be null for leaf nodes.
  */
  static fromSortedList(list, maxChildren, storage) {
    function addNextParentNode(parentNodeList) {
      if (list.length) {
        const keys = list.splice(0, maxChildren);
        return storage.put(new TreeNode(keys[0].targetHash, keys).serialize())
        .then(res => {
          parentNodeList.push({key: keys[1].key, targetHash: res, value: null});
          return addNextParentNode(parentNodeList);
        });
      }
      if (parentNodeList.length && parentNodeList[0].targetHash) {
        parentNodeList[0].key = ``;
      }
      return TreeNode.fromSortedList(parentNodeList, maxChildren, storage);
    }

    if (list.length > maxChildren) {
      return addNextParentNode([]);
    }

    const targetHash = list.length ? list[0].targetHash : null;
    const node = new TreeNode(targetHash, list);
    return storage.put(node.serialize()).then(hash => {
      node.hash = hash;
      return node;
    });
  }
}

export default TreeNode;
