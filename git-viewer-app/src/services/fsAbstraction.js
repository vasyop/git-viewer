import { FsaNodeFs } from 'memfs/lib/fsa-to-node';

class FSAbstraction {
  constructor(options = {}) {
    this.options = options
    this.fs = null
    this.pfs = null
    this.initialized = false
    this.directoryHandle = options.directoryHandle || null
  }

  async initialize() {
    if (this.initialized) return

    try {
        if (!this.directoryHandle) {
          throw new Error('Directory handle is required for local filesystem')
        }
        this.fs = new FsaNodeFs(this.directoryHandle);
        this.pfs = this.fs.promises
      
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize filesystem:', error)
      throw new Error(`Failed to initialize filesystem: ${error.message}`)
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  // Basic filesystem operations
  async readdir(path) {
    await this.ensureInitialized()
    return this.pfs.readdir(path)
  }

  async stat(path) {
    await this.ensureInitialized()
    return this.pfs.stat(path)
  }

  async readFile(path, encoding) {
    await this.ensureInitialized()
    return this.pfs.readFile(path, encoding)
  }

  async writeFile(path, content, encoding = 'utf8') {
    await this.ensureInitialized()
    return this.pfs.writeFile(path, content, encoding)
  }

  async mkdir(path, options = {}) {
    await this.ensureInitialized()
    return this.pfs.mkdir(path, options)
  }

  async rmdir(path) {
    await this.ensureInitialized()
    return this.pfs.rmdir(path)
  }

  async unlink(path) {
    await this.ensureInitialized()
    return this.pfs.unlink(path)
  }

  async exists(path) {
    await this.ensureInitialized()
    try {
      await this.pfs.stat(path)
      return true
    } catch {
      return false
    }
  }

  // Git-specific helpers
  async isGitRepository(path) {
    await this.ensureInitialized()
    try {
      let gitPath
      if (path === '') {
        gitPath = '.git'
      } else {
        gitPath = this.joinPath(path, '.git')
      }
      const stat = await this.pfs.stat(gitPath)
      return stat.isDirectory() || stat.isFile() // .git can be a directory or a file (worktrees)
    } catch (err) {
      console.log(err)
      return false
    }
  }

  // Path utilities
  joinPath(...parts) {
    // Simple path joining - works for both browser and local paths
    return parts.join('/').replace(/\/+/g, '/')
  }

  // Get the raw fs object for isomorphic-git
  getRawFS() {
    if (!this.initialized) {
      throw new Error('Filesystem not initialized')
    }
    return this.fs
  }

  getServerUrl() {
    return this.options.serverUrl
  }

  // Test connection (for File System Access API)
  async testConnection() {
    await this.ensureInitialized()
    
    try {
      // Try to read the directory to test access
      await this.pfs.readdir('.')
      return { connected: true }
    } catch (error) {
      return { 
        connected: false, 
        error: error.message,
        suggestion: 'Directory access may have been revoked. Please select the directory again.'
      }
    }
  }
}

export default FSAbstraction