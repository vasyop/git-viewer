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
    return this.pfs.readdir.apply(this.pfs, arguments);
  }

  async lstat() {
    return this.pfs.lstat.apply(this.pfs, arguments);
  }

  async readlink() {
    return this.pfs.readlink.apply(this.pfs, arguments);
  }

  async symlink() {
    return this.pfs.symlink.apply(this.pfs, arguments);
  }

  async stat() {
    return this.pfs.stat.apply(this.pfs, arguments);
  }

  async readFile() {
    return this.pfs.readFile.apply(this.pfs, arguments);
  }

  async writeFile() {
    return this.pfs.writeFile.apply(this.pfs, arguments);
  }

  async mkdir() {
    return this.pfs.mkdir.apply(this.pfs, arguments);
  }

  async rmdir() {
    return this.pfs.rmdir.apply(this.pfs, arguments);
  }

  async unlink() {
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
