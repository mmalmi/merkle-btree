class IPFSStorage {
  constructor(ipfs) {
    this.ipfs = ipfs;
  }

  put(value) {
    return this.ipfs.files.add(value).then(res => {
      return res.Hash;
    });
  }

  get(key) {
    return this.ipfs.files.cat(key, {buffer: true});
  }

  remove(key) {
    return key;
  }

  clear() {
    return null;
  }
}

export default IPFSStorage;
