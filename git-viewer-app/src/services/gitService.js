import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import FSAbstraction from "./fsAbstraction.js";

class GitService {
  constructor() {
    this.repositories = new Map
  }

  async openLocalRepository(directoryHandle) {
    try {
      // Create filesystem with directory handle
      const fs = new FSAbstraction({ directoryHandle });

      // Check if the directory is a git repository
      const isGitRepo = await fs.isGitRepository();
      if (!isGitRepo) {
        throw new Error("Selected directory is not a git repository");
      }

      // Create a unique name for the local repo
      const repoName = directoryHandle.name;

      // Store repository metadata
      this.repositories.set(repoName, {
        name: repoName,
        displayName: repoName,
        fs,
        directoryHandle,
        clonedAt: new Date().toISOString(),
      });

      return repoName;
    } catch (error) {
      console.error("Error opening local repository:", error);
      throw new Error(`Failed to open local repository: ${error.message}`);
    }
  }

  getFileSystemForRepo(repoName) {
    return this.repositories.get(repoName).fs;
  }

  async getRepositories() {
    const repos = [];

    // Add local repositories from memory
    for (const [repoName, repoData] of this.repositories) {
      repos.push({
        name: repoName,
        displayName: repoData.displayName,
        clonedAt: repoData.clonedAt,
        type: "local",
      });
    }

    return repos;
  }

  async getFileTree(repoName) {
    const fs = this.getFileSystemForRepo(repoName);

    try {
      const files = await this._getAllFiles(fs);
      const tree = [];

      // Create a set to track directories we've already added
      const addedDirs = new Set();

      for (const filePath of files) {
        const pathParts = filePath.split("/");

        // Add directories
        for (let i = 0; i < pathParts.length - 1; i++) {
          const dirPath = pathParts.slice(0, i + 1).join("/");
          if (!addedDirs.has(dirPath)) {
            tree.push({
              name: pathParts[i],
              path: dirPath,
              isDirectory: true,
              depth: i,
            });
            addedDirs.add(dirPath);
          }
        }

        // Add file
        tree.push({
          name: pathParts[pathParts.length - 1],
          path: filePath,
          isDirectory: false,
          depth: pathParts.length - 1,
        });
      }

      return tree.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Error getting file tree:", error);
      throw new Error(`Failed to get file tree: ${error.message}`);
    }
  }


  async _getAllFiles(fs) {
    const files2 = [];
    async function* getFilesRecursively(entry, path = "") {
      if (entry.kind === "file") {
        const file = await entry.getFile();
        if (file !== null) {
          yield path;
        }
      } else if (entry.kind === "directory" && entry.name !== ".git") {
        for await (const handle of entry.values()) {
          yield* getFilesRecursively(
            handle,
            path ? path + "/" + handle.name : handle.name
          );
        }
      }
    }
    for await (const file of getFilesRecursively(fs.directoryHandle)) {
      files2.push(file);
    }
    return files2.sort();
  }

  async readFile(repoName, filePath) {
    try {
      const fs = this.getFileSystemForRepo(repoName);
      const content = await fs.readFile('/' + filePath, "utf8");
      return content;
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(repoName, filePath, content) {
    try {
      const fs = this.getFileSystemForRepo(repoName);
      await fs.writeFile(filePath, content, "utf8");
      console.log(`File saved: ${filePath}`);
    } catch (error) {
      console.error("Error writing file:", error);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async commitChanges(repoName, message, onMessage = null) {
    const fs = this.getFileSystemForRepo(repoName);
    const dir = ''; // root of the repository

    try {
      const matrix = await git.statusMatrix({
        fs,
        dir,
        ignored: false, // Include ignored files
      });

      const toAdd = [];
      const toRemove = [];

      for (const row of matrix) {
        const [filepath, head, workdir] = row;
        if (head === workdir) continue; // unmodified

        if (workdir === 0) {
          // deleted in workdir
          toRemove.push(filepath);
          if (onMessage) onMessage(`  deleted: ${filepath}`);
        } else {
          // new or modified
          toAdd.push(filepath);
          if (onMessage) onMessage(`  added/modified: ${filepath}`);
        }
      }

      // 2. Stage all additions / deletions in *one* call each.
      if (toAdd.length) {
        await git.add({
          fs,
          dir,
          filepath: toAdd,
          parallel: true, // use parallel mode for speed
        });
      }
      if (toRemove.length) {
        await git.remove({
          fs,
          dir,
          filepath: toRemove,
          parallel: true,
        });
      }

      if (onMessage) onMessage(`git commit -m "${message}"`);
      // Create commit
      await git.commit({
        fs,
        dir,
        author: {
          name: "Git Viewer User",
          email: "user@gitviewer.app",
        },
        message,
      });
      console.log(`git commit completed`);
    } catch (error) {
      console.error("Commit failed:", error);
      throw new Error(`Failed to commit changes: ${error.message}`);
    }
  }

  async pushChanges(repoName, onMessage = null) {
    const fs = this.getFileSystemForRepo(repoName);

    try {

      if (onMessage) onMessage("git push origin main");
      await git.push({
        fs,
        http,
        dir: '',
        remote: "origin",
        ref: "main", // or detect current branch
        corsProxy: "https://cors.isomorphic-git.org",
        onMessage: onMessage || undefined,
      });
      console.log(`git push completed`);
    } catch (error) {
      console.error("Push failed:", error);
      throw new Error(`Failed to push changes: ${error.message}`);
    }
  }

  async getCommits(repoName, maxCount = 50) {
    const fs = this.getFileSystemForRepo(repoName);
    const dir = '';

    try {

      // Get only commit metadata from what's already available (no additional fetch)
      const commits = await git.log({
        fs,
        dir,
        depth: maxCount,
      });

      // Return just the essential metadata (no file trees or changes)
      return commits.map((commit) => ({
        oid: commit.oid,
        commit: {
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            timestamp: commit.commit.author.timestamp,
          },
        },
      }));
    } catch (error) {
      console.error(`Error getting commits for ${repoName}:`, error);
      throw new Error(`Failed to get commits: ${error.message}`);
    }
  }

  async getCommitFiles(repoName, commitOid) {
    const fs = this.getFileSystemForRepo(repoName);
    const dir = '';

    try {

      const { commit } = await git.readCommit({
        fs,
        dir,
        oid: commitOid,
      });

      // If this is the first commit, return all files in that commit
      if (commit.parent.length === 0) {
        const changes = [];
        await this.walkCommitTree(fs, dir, commit.tree, "", changes);
        return changes;
      }

      // Use git walk to efficiently compare with parent
      const parentOid = commit.parent[0];
      const changes = [];

      await git.walk({
        fs,
        dir,
        trees: [git.TREE({ ref: commitOid }), git.TREE({ ref: parentOid })],
        map: async function (filepath, [A, B]) {
          // Skip directories
          if (filepath === ".") return;

          // Get file info
          const aType = await A?.type();
          const bType = await B?.type();

          // Only process files, not directories
          if (aType === "tree" || bType === "tree") return;

          const aOid = await A?.oid();
          const bOid = await B?.oid();

          // File was added, deleted, or modified
          if (aOid !== bOid) {
            changes.push(filepath);
          }
        },
      });

      return changes;
    } catch (error) {
      console.error("Error getting commit files:", error);
      return [];
    }
  }

  // Helper method to walk tree for first commit
  async walkCommitTree(fs, dir, treeOid, prefix, files) {
    try {
      const tree = await git.readTree({ fs, dir, oid: treeOid });

      for (const entry of tree.tree) {
        const path = prefix + entry.path;
        if (entry.type === "blob") {
          files.push(path);
        } else if (entry.type === "tree") {
          await this.walkCommitTree(fs, dir, entry.oid, path + "/", files);
        }
      }
    } catch (error) {
      console.error("Error walking commit tree:", error);
    }
  }
}

export const gitService = new GitService();
