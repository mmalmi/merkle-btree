class IPFSStorage {
  constructor(ipfs) {
    this.ipfs = ipfs;
  }

  put(value) {
    return this.ipfs.files.add(new Buffer(value, `utf8`)).then(res => {
      return res[0].hash;
    });
  }

  get(key) {
    return this.ipfs.files.cat(key)
      .then(stream => {
        return new Promise((resolve, reject) => {
          let res = ``;

          stream.on(`data`, function (chunk) {
            res += chunk.toString();
          });

          stream.on(`error`, function (err) {
            reject(err);
          });

          stream.on(`end`, function () {
            resolve(res);
          });
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

export default IPFSStorage;
