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
      .then(file => {
        return file.toString(`utf8`);
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
