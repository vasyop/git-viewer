import { FsaNodeFs } from "memfs/lib/fsa-to-node";

class FSAbstraction {
  constructor(options = {}) {
    this.options = options;
    this.fs = null;
    this.pfs = null;
    this.directoryHandle = options.directoryHandle || null;
    this.fs = new FsaNodeFs(this.directoryHandle);
    this.pfs = this.fs.promises;
  }

  async readdir() {
    console.log('readdir', arguments);
    return this.pfs.readdir.apply(this.pfs, arguments);
  }

  async lstat() {
    console.log('lstat', arguments);
    return this.pfs.lstat.apply(this.pfs, arguments);
  }

  async readlink() {
    console.log('readlink', arguments);
    return this.pfs.readlink.apply(this.pfs, arguments);
  }

  async symlink() {
    console.log('symlink', arguments);
    return this.pfs.symlink.apply(this.pfs, arguments);
  }

  async stat() {
    console.log('stat', arguments);
    return this.pfs.stat.apply(this.pfs, arguments);
  }

  async readFile() {
    console.log('readFile', arguments);
    return this.pfs.readFile.apply(this.pfs, arguments);
  }

  async writeFile() {
    console.log('writeFile', arguments);
    return this.pfs.writeFile.apply(this.pfs, arguments);
  }

  async mkdir() {
    console.log('mkdir', arguments);
    return this.pfs.mkdir.apply(this.pfs, arguments);
  }

  async rmdir() {
    console.log('rmdir', arguments);
    return this.pfs.rmdir.apply(this.pfs, arguments);
  }

  async unlink() {
    console.log('unlink', arguments);
    return this.pfs.unlink.apply(this.pfs, arguments);
  }

  async isGitRepository() {
    try {
      const stat = await this.pfs.stat(".git");
      return stat.isDirectory() || stat.isFile(); // .git can be a directory or a file (worktrees)
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}

export default FSAbstraction;
