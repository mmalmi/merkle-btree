import {createHash} from 'crypto';

class RAMStorage {
  constructor() {
    this.storage = {};
  }

  put(value) {
    const sha256 = createHash(`sha256`);
    sha256.update(value);
    const hash = sha256.digest(`base64`);
    this.storage[hash] = value;
    return hash;
  }

  get(key) {
    return this.storage[key];
  }

  remove(key) {
    delete this.storage[key];
  }

  clear() {
    this.storage = {};
  }
}

export default RAMStorage;
