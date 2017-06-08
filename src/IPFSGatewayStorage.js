function browserGet(url) {
  return new Promise((resolve, reject) => {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
      if (xmlHttp.readyState === 4) {
        if (xmlHttp.status >= 200 && xmlHttp.status < 300) resolve(xmlHttp.responseText);
        else reject(xmlHttp.responseText);
      }
    };
    xmlHttp.open(`GET`, url, true); // true for asynchronous
    xmlHttp.send(null);
  });
}

// thanks https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
function nodeGet(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith(`https`) ? require(`https`) : require(`http`);
    const request = lib.get(url, response => {
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
}

function getContent(url) {
  if (typeof require !== `undefined` && require.resolve(`http`) && require.resolve(`https`)) {
    return nodeGet(url);
  } else {
    return browserGet(url);
  }
}

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
