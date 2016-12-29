import {createHash} from 'crypto';
import promises from 'es6-promise';
promises.polyfill();

class RAMStorage {
  constructor() {
    this.storage = {};
  }

  put(value) {
    return new Promise(resolve => {
      const sha256 = createHash(`sha256`);
      sha256.update(value);
      const hash = sha256.digest(`base64`);
      this.storage[hash] = value;
      resolve(hash);
    });
  }

  get(key) {
    return new Promise(resolve => {
      resolve(this.storage[key]);
    });
  }

  remove(key) {
    return new Promise(resolve => {
      delete this.storage[key];
      resolve();
    });
  }

  clear() {
    return new Promise(resolve => {
      this.storage = {};
      resolve();
    });
  }
}

export default RAMStorage;
