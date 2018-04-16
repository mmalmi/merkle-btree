
import {createHash} from 'crypto';

class GUNStorage {
  constructor(gun) {
    this.gun = gun.get(`identifi`);
  }

  put(value) {
    const sha256 = createHash(`sha256`);
    sha256.update(value);
    const hash = sha256.digest(`base64`);
    return new Promise((resolve, reject) => {
      this.gun.get(hash).put(value, ack => {
        if (ack.err) {
          return reject(ack.err);
        }
        resolve(hash);
      });
    });
  }

  get(hash) {
    return new Promise((resolve, reject) => {
      this.gun.get(hash).once(data => {
        if (!data) {
          return reject(`Error: Hash cannot be found at ${hash}`);
        }
        resolve(data);
      });
    });
  }

  remove(key) {
    return Promise.resolve(key);
  }

  clear() {
    return Promise.resolve();
  }
}

export default GUNStorage;
