import { FsaNodeFs } from "memfs/lib/fsa-to-node";
// import LightningFS from "@isomorphic-git/lightning-fs";

class FSAbstraction {
  constructor(options = {}) {
    // this.lfs = new LightningFS("fs", { wipe: true });
    // this.lpfs = this.lfs.promises;

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
      if (!this[name]) {
        this[name] = async (...args) => {
          for (const idx of pathIndexes) {
            if (idx != null && args[idx] !== undefined) {
              args[idx] = this.normalize(args[idx]);
            }
          }

          let result = await this.pfs[name](...args);
          if (result instanceof Uint8Array) {
            // sometimes Uint8Array is somehow different. it is serialized as {type: '...' data: [...]}
            // causes files to appear modified even though they are not
            // normalize it
            result = new Uint8Array(result); 
          }

          // const memResult = (await this.lpfs[name](...args)) ?? undefined;
          // if (name === "readdir" && Array.isArray(memResult)) {
          //   memResult.sort();
          // }
          // if (JSON.stringify(result) !== JSON.stringify(memResult)) {
          //   if (name !== "stat" && name !== "lstat") {
          //     console.error(`File system inconsistency detected in ${name}`);
          //   } else {
          //     console.warn('stat/lstat inconsistency')
          //   }
          // }



          return result;
        };
      }
    });
  }

  normalize(path) {
    if (typeof path !== "string") {
      return path;
    }
    // Make sure no leading "./" segments, collapse duplicate slashes, normalize separators
    // Ensure there is exactly ONE leading slash (TODO implemented)
    let p = path.replace(/\\/g, "/"); // windows -> posix

    // Remove leading ./ segments repeatedly
    while (p.startsWith("./")) {
      p = p.slice(2);
    }

    // Collapse multiple slashes
    p = p.replace(/\/+/g, "/");

    // Remove a trailing '/.' (current dir) while preserving root
    if (p.endsWith("/.")) {
      p = p.slice(0, -2);
    }

    // If empty after cleanup, treat as root
    if (p === "" || p === ".") {
      return "/";
    }

    // Strip all leading slashes then add exactly one
    p = p.replace(/^\/+/, "");
    p = "/" + p;

    return p;
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
