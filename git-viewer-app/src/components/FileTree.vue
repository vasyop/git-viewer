<template>
  <div class="file-tree-container">
    <div class="tree-controls">
      <button class="btn btn-sm btn-outline-secondary" @click="expandAll" title="Expand All">
        <i class="bi bi-arrows-expand"></i>
      </button>
      <button class="btn btn-sm btn-outline-secondary ms-2" @click="collapseAll" title="Collapse All">
        <i class="bi bi-arrows-collapse"></i>
      </button>
      <button class="btn btn-sm btn-outline-secondary ms-2" @click="createFile" title="Create File">
        <i class="bi bi-file-earmark-plus"></i>
      </button>
      <button class="btn btn-sm btn-outline-secondary ms-2" @click="$emit('refresh-requested')" title="Refresh">
        <i class="bi bi-arrow-repeat"></i>
      </button>
    </div>
    
    <div class="file-tree">
      <template v-for="file in visibleFiles" :key="file.path">
        <div class="file-item d-flex align-items-center justify-content-between"
             :class="{ 'selected': selectedFile === file.path, 'fw-bold': selectedFile === file.path }"
             @click="handleItemClick(file)"
             :style="{ paddingLeft: (file.depth * 20 + 10) + 'px' }">
          <div class="d-flex align-items-center flex-grow-1 overflow-hidden">
            <span v-if="file.isDirectory" class="folder-toggle me-1" @click.stop="toggleFolder(file.path)">
              <i :class="expandedFolders.has(file.path) ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
            </span>
            <i :class="file.isDirectory ? (expandedFolders.has(file.path) ? 'bi bi-folder2-open' : 'bi bi-folder2') : 'bi bi-file-text'" class="me-2"></i>
            <span class="text-truncate" :class="{ 'fw-bold': selectedFile === file.path }">{{ file.name }}</span>
          </div>
          <div class="actions ms-2" @click.stop>
            <button v-if="!file.isDirectory"
                    class="btn btn-link btn-sm p-0 text-danger opacity-50 hover-visible" 
                    title="Delete" 
                    @click="confirmDelete(file)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'FileTree',
  props: {
    files: {
      type: Array,
      required: true
    },
    selectedFile: {
      type: String,
      default: ''
    },
    repoName: {
      type: String,
      required: false,
      default: ''
    }
  },
  emits: ['file-selected', 'refresh-requested'],
  setup(props, { emit }) {
    const expandedFolders = ref(new Set())
    
    // Watch for file changes and reinitialize expanded folders
    watch(() => props.files, (newFiles) => {
      // Keep existing expanded state for folders that still exist
      const existingFolders = new Set()
      newFiles.forEach(file => {
        if (file.isDirectory) {
          existingFolders.add(file.path)
        }
      })
      
      // Remove expanded state for folders that no longer exist
      const newExpanded = new Set()
      expandedFolders.value.forEach(path => {
        if (existingFolders.has(path)) {
          newExpanded.add(path)
        }
      })
      
      // Expand root level folders by default
      newFiles.forEach(file => {
        if (file.isDirectory && file.depth === 0) {
          newExpanded.add(file.path)
        }
      })
      
      expandedFolders.value = newExpanded
    }, { immediate: true, deep: true })
    
    const toggleFolder = (path) => {
      if (expandedFolders.value.has(path)) {
        expandedFolders.value.delete(path)
      } else {
        expandedFolders.value.add(path)
      }
      // Force reactivity
      expandedFolders.value = new Set(expandedFolders.value)
    }
    
    const expandAll = () => {
      props.files.forEach(file => {
        if (file.isDirectory) {
          expandedFolders.value.add(file.path)
        }
      })
      expandedFolders.value = new Set(expandedFolders.value)
    }
    
    const collapseAll = () => {
      expandedFolders.value.clear()
      expandedFolders.value = new Set(expandedFolders.value)
    }

    const promptPath = (label, isDir = false) => {
      if (!props.repoName) {
        alert('No repository selected')
        return
      }
      const full = prompt(label + '\nEnter full path relative to repo root:', '')
      if (!full) return
      return full.trim().replace(/^\/+/, '')
    }

    const createFile = async () => {
      const path = promptPath('Create File', false)
      if (!path) {
        return
      }

      const { gitService } = await import('../services/gitService.js')
      await gitService.createFile(props.repoName, path, '')
      emit('refresh-requested')
    }

    const confirmDelete = async (file) => {
      if (!confirm(`Delete file "${file.path}"? This cannot be undone.`)) {
        return
      }

      const { gitService } = await import('../services/gitService.js')
      await gitService.deletePath(props.repoName, file.path)
      emit('refresh-requested')
    }
    
    const handleItemClick = (file) => {
      if (file.isDirectory) {
        toggleFolder(file.path)
      } else {
        emit('file-selected', file.path)
      }
    }
    
    const visibleFiles = computed(() => {
      const visible = []
      const collapsedPaths = new Set()
      
      // First, identify all collapsed folders
      props.files.forEach(file => {
        if (file.isDirectory && !expandedFolders.value.has(file.path)) {
          collapsedPaths.add(file.path)
        }
      })
      
      // Sort files for proper display order
      const sortedFiles = [...props.files].sort((a, b) => {
        // Split paths to compare properly
        const aParts = a.path.split('/')
        const bParts = b.path.split('/')
        
        // Compare each path segment
        const minLength = Math.min(aParts.length, bParts.length)
        for (let i = 0; i < minLength; i++) {
          if (aParts[i] !== bParts[i]) {
            // At the same level, directories come first
            const aIsDir = i < aParts.length - 1 || a.isDirectory
            const bIsDir = i < bParts.length - 1 || b.isDirectory
            
            if (aIsDir && !bIsDir) return -1
            if (!aIsDir && bIsDir) return 1
            
            return aParts[i].localeCompare(bParts[i])
          }
        }
        
        // If one is parent of the other
        if (aParts.length !== bParts.length) {
          return aParts.length - bParts.length
        }
        
        // Same path (shouldn't happen)
        return 0
      })
      
      // Filter visible files
      for (const file of sortedFiles) {
        let isVisible = true
        
        // Check if any parent folder is collapsed
        const pathParts = file.path.split('/')
        for (let i = 0; i < pathParts.length - 1; i++) {
          const parentPath = pathParts.slice(0, i + 1).join('/')
          if (collapsedPaths.has(parentPath)) {
            isVisible = false
            break
          }
        }
        
        if (isVisible) {
          visible.push(file)
        }
      }
      
      return visible
    })

    return {
      expandedFolders,
      visibleFiles,
      toggleFolder,
      expandAll,
      collapseAll,
      handleItemClick,
      createFile,
      confirmDelete
    }
  }
}
</script>

<style scoped>
.file-tree-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-controls {
  padding: 8px;
  border-bottom: 1px solid #dee2e6;
  background-color: #f8f9fa;
}

:global(.dark-theme) .tree-controls {
  background-color: #252526 !important;
  border-color: #404040;
}

:global(.dark-theme) .tree-controls .btn-outline-secondary {
  background-color: #404040;
  border-color: #6c757d;
  color: #e0e0e0;
}

:global(.dark-theme) .tree-controls .btn-outline-secondary:hover {
  background-color: #505357;
  border-color: #6c757d;
  color: #fff;
}

.file-tree {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  overflow-y: auto;
  overflow-x: auto;
  flex: 1;
  padding: 8px 0;
}

.file-item {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  white-space: nowrap;
  user-select: none;
}

.file-item .actions { visibility: hidden; }
.file-item:hover .actions, .file-item.selected .actions { visibility: visible; }
.file-item .btn.btn-link { text-decoration: none; }
.file-item .btn.btn-link:hover { opacity: 1 !important; }

.file-item:hover {
  background-color: #f8f9fa;
}

.file-item.selected {
  background-color: #0078d4;
  color: white;
}

.file-item.selected:hover {
  background-color: #106ebe;
}

/* Dark theme styles */
:global(.dark-theme) .file-item {
  color: #e0e0e0;
}

:global(.dark-theme) .file-item:hover {
  background-color: #404040;
}

:global(.dark-theme) .file-item.selected {
  background-color: #fd0d31;
  color: white;
  font-weight: bold;
}

:global(.dark-theme) .file-item.selected:hover {
  background-color: #05152d;
}

.folder-toggle {
  display: inline-block;
  width: 16px;
  cursor: pointer;
}

.folder-toggle i {
  font-size: 0.75rem;
}

.fw-bold {
  font-weight: bold !important;
}
</style>