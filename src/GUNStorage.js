
import {createHash} from 'crypto';

class GUNStorage {
  constructor(gun) {
    this.gun = gun.get(`identifi`);
  }

  put(value) {
    return new Promise((resolve, reject) => {
      const sha256 = createHash(`sha256`);
      sha256.update(value);
      const hash = sha256.digest(`base64`);
      console.log(`put`, hash);
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
      console.log(`get`, hash);
      this.gun.get(hash).once(data => {
        if (!data) {
          return reject(`Error: Hash cannot be found at ${hash}`);
        }
        resolve(data);
      });
    });
  }

  remove(hash) {
    return new Promise(resolve => {
      resolve();
    });
    /*
    return new Promise((resolve, reject) => {
      console.log(`remove`, hash);
      this.gun.get(hash).put(null, ack => {
        if (ack.err) {
          return reject(ack.err);
        }
        resolve(ack.ok || `Nulled!`);
      });
    });
    */
  }

  clear() {
    return new Promise(resolve => {
      resolve();
    });
  }
}

export default GUNStorage;
