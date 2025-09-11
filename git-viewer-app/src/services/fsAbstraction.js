import { FsaNodeFs } from "memfs/lib/fsa-to-node";

class FSAbstraction {
  constructor(options = {}) {
    this.options = options;
    this.fs = null;
    this.pfs = null;
    this.directoryHandle = options.directoryHandle || null;
    this.fs = new FsaNodeFs(this.directoryHandle);
    this.pfs = this.fs.promises;

    // Dynamically create thin wrapper methods that:
    // 1. Normalize specified argument indexes (usually the path at index 0, symlink uses index 1)
    // 2. Call the underlying promise fs method
    // 3. Log AFTER normalization to reflect the actual values passed
    // This removes a lot of boilerplate while keeping explicit method names.
    const methodPathArgMap = {
      readdir: [0],
      lstat: [0],
      readlink: [0],
      symlink: [1], // (target, path) => need to normalize the path (2nd arg)
      stat: [0],
      readFile: [0],
      writeFile: [0],
      mkdir: [0],
      rmdir: [0],
      unlink: [0],
    };

    Object.entries(methodPathArgMap).forEach(([name, pathIndexes]) => {
      // Only create if not already defined on instance (allows future overrides)
      if (!this[name]) {
        this[name] = async (...args) => {
          if (Array.isArray(pathIndexes)) {
            for (const idx of pathIndexes) {
              if (idx != null && args[idx] !== undefined) {
                args[idx] = this.normalize(args[idx]);
              }
            }
          }
          // Log after normalization so we can see the actual values being passed
          console.log(name, args);
          return this.pfs[name](...args);
        };
      }
    });
  }

  // (Legacy note) Individual async methods were replaced by dynamic generation in constructor.

  normalize(path) {
    if (typeof path !== "string") {
      return path;
    }
    // make sure no leading ".". no, double slashes, etc
    return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/\.$/, "");
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
