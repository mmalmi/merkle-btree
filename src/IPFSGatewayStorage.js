import {get as httpGet} from 'http';
import {get as httpsGet} from 'https';

// thanks https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
const getContent = function(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const get = url.startsWith(`https`) ? httpsGet : httpGet;
    const request = get(url, response => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`Failed to load page, status code: ${response.statusCode}`));
      }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on(`data`, chunk => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on(`end`, () => resolve(body.join(``)));
    });
    // handle connection errors of the request
    request.on(`error`, err => reject(err));
  });
};

class IPFSGatewayStorage {
  constructor(apiRoot = ``) {
    this.apiRoot = apiRoot;
  }

  get(key) {
    if (!key.match(/^\/ip(fs|ns)\//)) {
      key = `/ipfs/${key}`;
    }
    return getContent(this.apiRoot + key);
  }

  remove() {
    return Promise.resolve();
  }

  put() {
    return Promise.resolve();
  }
}

export default IPFSGatewayStorage;
