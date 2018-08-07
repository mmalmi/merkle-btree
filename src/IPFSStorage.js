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

  remove() {
    // Apparently js-ipfs files are autoremoved if they are not pinned
    return Promise.resolve();
  }

  clear() {
    return Promise.resolve();
  }
}

export default IPFSStorage;
