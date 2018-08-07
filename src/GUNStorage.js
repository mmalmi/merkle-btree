
import {randomBytes} from 'crypto';

class GUNStorage {
  constructor(gun) {
    this.gun = gun.get(`identifi`);
  }

  put(value, name) {
    return new Promise(resolve => {
      randomBytes(32, (err, buffer) => {
        const key = name || buffer.toString(`base64`);
        this.gun.get(key).put(value, ack => {
          console.log(`waiting for ack`);
          if (ack.err) {
            console.log(`ack error!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
            return;
            // return reject(ack.err);
          }
          console.log(`ack success!`, key);
        });
        resolve(key);
      });
    });
  }

  get(hash) {
    return new Promise(resolve => {
      this.gun.get(hash).on((data, key, msg, event) => {
        event.off();
        if (!data) {
          return;
          //return reject(`Error: Hash cannot be found at ${hash}`);
        }
        resolve(data);
      });
    });
  }

  remove(key) {
    return new Promise((resolve, reject) => {
      this.gun.get(key).put(null, ack => {
        if (ack.err) {
          return reject(ack.err);
        }
      });
      resolve(key);
    });
  }

  clear() {
    return Promise.resolve();
  }
}

export default GUNStorage;
