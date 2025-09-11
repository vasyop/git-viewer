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

  // Basic filesystem operations
  async readdir(path) {
    return this.pfs.readdir(path);
  }

  async stat(path) {
    return this.pfs.stat(path);
  }

  async readFile(path, encoding) {
    return this.pfs.readFile(path, encoding);
  }

  async writeFile(path, content, encoding = "utf8") {
    return this.pfs.writeFile(path, content, encoding);
  }

  async mkdir(path, options = {}) {
    return this.pfs.mkdir(path, options);
  }

  async rmdir(path) {
    return this.pfs.rmdir(path);
  }

  async unlink(path) {
    return this.pfs.unlink(path);
  }

  async exists(path) {
    try {
      await this.pfs.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  // Git-specific helpers
  async isGitRepository(path) {
    try {
      let gitPath;
      if (path === "") {
        gitPath = ".git";
      } else {
        gitPath = this.joinPath(path, ".git");
      }
      const stat = await this.pfs.stat(gitPath);
      return stat.isDirectory() || stat.isFile(); // .git can be a directory or a file (worktrees)
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  // Path utilities
  joinPath(...parts) {
    // Simple path joining - works for both browser and local paths
    return parts.join("/").replace(/\/+/g, "/");
  }

  // Get the raw fs object for isomorphic-git
  getRawFS() {
    return this.fs;
  }

  getServerUrl() {
    return this.options.serverUrl;
  }
}

export default FSAbstraction;
