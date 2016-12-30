import {get} from 'request';

class IPFSGatewayStorage {
  constructor(apiRoot = ``) {
    this.apiRoot = apiRoot;
  }

  get(key) {
    return new Promise((resolve, reject) => {
      if (!key.match(/^\/ip(fs|ns)\//)) {
        key = `/ipfs/${key}`;
      }
      get(this.apiRoot + key, (error, response, body) => {
        if (error) { reject(error); }
        resolve(body);
      });
    });
  }

  remove() {
    return Promise.resolve();
  }

  put() {
    return Promise.resolve();
  }
}

export default IPFSGatewayStorage;
