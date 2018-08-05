import {randomBytes} from 'crypto';

class RAMStorage {
  constructor() {
    this.storage = {};
  }

  put(value) {
    return new Promise(resolve => {
      randomBytes(32, (err, buffer) => {
        const key = buffer.toString(`base64`);
        this.storage[key] = value;
        resolve(key);
      });
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
