import React, { useState, useEffect } from 'react';
import { FolderType, SnippetType } from '../../types/snippet';
import { useSnippets } from '../../contexts/SnippetContext';
import { FaFolder, FaFolderOpen, FaFile, FaPlus, FaTrash, FaEdit, FaSearch, FaTag, FaSync } from 'react-icons/fa';
import './SnippetPanel.css';
import { extractFolderPaths, createNewSnippet, generateId, parseFrontmatter } from '../../utils/frontmatter';

interface SnippetPanelProps {
  onSelectSnippet?: (snippet: SnippetType) => void;
  className?: string;
  currentMode: 'notebook' | 'node';
}

const SnippetPanel: React.FC<SnippetPanelProps> = ({ onSelectSnippet, className, currentMode }) => {
  const { snippets, folders, addSnippet, updateSnippet, deleteSnippet, addFolder, deleteFolder } = useSnippets();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [newSnippetName, setNewSnippetName] = useState('');
  const [currentFolder, setCurrentFolder] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingSnippet, setIsCreatingSnippet] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<SnippetType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SnippetType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingSnippetContent, setEditingSnippetContent] = useState('');

  // Organize snippets by folder
  const folderStructure = React.useMemo(() => {
    const structure: Record<string, SnippetType[]> = {};
    
    // Initialize with empty arrays for all folders
    folders.forEach(folder => {
      structure[folder] = [];
    });
    
    // Add root level
    structure[''] = [];
    
    // Add snippets to their respective folders
    snippets.forEach(snippet => {
      if (structure[snippet.folder] !== undefined) {
        structure[snippet.folder].push(snippet);
      } else {
        // If folder doesn't exist yet, create it
        structure[snippet.folder] = [snippet];
        
        // Ensure all parent folders exist
        const folderPaths = extractFolderPaths(snippet.folder);
        folderPaths.forEach(path => {
          if (structure[path] === undefined) {
            structure[path] = [];
            // Add this folder to the folders list if it's not already there
            if (!folders.includes(path)) {
              addFolder(path);
            }
          }
        });
      }
    });
    
    return structure;
  }, [snippets, folders, addFolder]);

  // Get direct subfolders of a folder
  const getSubfolders = (parentPath: string): FolderType[] => {
    return folders
      .filter(folder => {
        const folderParts = folder.split('/');
        const parentParts = parentPath ? parentPath.split('/') : [];
        
        return folderParts.length === parentParts.length + 1 && 
               (parentPath === '' || folder.startsWith(parentPath + '/'));
      })
      .map(path => ({
        id: generateId(), // Generate a unique ID for each folder
        name: path.split('/').pop() || '',
        parentId: parentPath ? parentPath : null,
        path: path,
        isExpanded: expandedFolders[path]
      }));
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newPath = currentFolder 
      ? `${currentFolder}/${newFolderName.trim()}`
      : newFolderName.trim();
    
    addFolder(newPath);
    setNewFolderName('');
    setIsCreatingFolder(false);
    
    // Auto-expand parent folder
    if (currentFolder) {
      setExpandedFolders(prev => ({
        ...prev,
        [currentFolder]: true
      }));
    }
  };

  const handleCreateSnippet = () => {
    if (!newSnippetName.trim()) return;
    
    const newSnippet = createNewSnippet(
      newSnippetName.trim(),
      '---\ntitle: ' + newSnippetName.trim() + '\ntags: []\n---\n\n',
      currentFolder
    );
    
    addSnippet(newSnippet);
    setNewSnippetName('');
    setIsCreatingSnippet(false);
    
    // Auto-expand parent folder
    if (currentFolder) {
      setExpandedFolders(prev => ({
        ...prev,
        [currentFolder]: true
      }));
    }
  };

  const handleEditSnippet = (snippet: SnippetType) => {
    setEditingSnippet(snippet);
    setEditingSnippetContent(snippet.content);
  };

  const handleSaveSnippet = () => {
    if (!editingSnippet) return;
    
    // Extract folder path from content if it exists
    const { frontmatter } = parseFrontmatter(editingSnippetContent);
    const folderPath = frontmatter.folder || editingSnippet.folder;
    
    // Update the snippet with new content and possibly new folder
    updateSnippet(editingSnippet.id, {
      content: editingSnippetContent,
      folder: folderPath
    });
    
    // If folder path changed, ensure it exists
    if (folderPath && folderPath !== editingSnippet.folder && !folders.includes(folderPath)) {
      addFolder(folderPath);
      
      // Auto-expand the folder
      setExpandedFolders(prev => ({
        ...prev,
        [folderPath]: true
      }));
    }
    
    setEditingSnippet(null);
    setEditingSnippetContent('');
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = snippets.filter(snippet => {
      // Search in title
      if (snippet.title.toLowerCase().includes(query)) return true;
      
      // Search in content
      if (snippet.content.toLowerCase().includes(query)) return true;
      
      // Search in tags
      if (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes(query))) return true;
      
      // Search in frontmatter
      const { frontmatter } = parseFrontmatter(snippet.content);
      for (const key in frontmatter) {
        const value = frontmatter[key];
        if (typeof value === 'string' && value.toLowerCase().includes(query)) return true;
      }
      
      return false;
    });
    
    setSearchResults(results);
    setIsSearching(true);
  };

  const handleDragStart = (e: React.DragEvent, snippet: SnippetType) => {
    e.dataTransfer.setData('application/json', JSON.stringify(snippet));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderFolder = (folder: FolderType) => {
    const subfolders = getSubfolders(folder.path);
    const folderSnippets = folderStructure[folder.path] || [];
    const isExpanded = expandedFolders[folder.path];
    
    return (
      <div key={folder.path} className="snippet-folder">
        <div 
          className="folder-header"
          onClick={() => toggleFolder(folder.path)}
        >
          {isExpanded ? <FaFolderOpen /> : <FaFolder />}
          <span className="folder-name">{folder.name}</span>
        </div>
        
        {isExpanded && (
          <div className="folder-content">
            {subfolders.map(subfolder => renderFolder(subfolder))}
            
            {folderSnippets.map(snippet => (
              <div 
                key={snippet.id} 
                className="snippet-item"
                onClick={() => onSelectSnippet && onSelectSnippet(snippet)}
                draggable
                onDragStart={(e) => handleDragStart(e, snippet)}
              >
                <FaFile />
                <span className="snippet-title">{snippet.title}</span>
                <div className="snippet-actions">
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSnippet(snippet);
                    }}
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="action-button delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSnippet(snippet.id);
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="folder-actions">
              <button 
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentFolder(folder.path);
                  setIsCreatingFolder(true);
                  setIsCreatingSnippet(false);
                }}
              >
                <FaFolder /> <FaPlus />
              </button>
              <button 
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentFolder(folder.path);
                  setIsCreatingSnippet(true);
                  setIsCreatingFolder(false);
                }}
              >
                <FaFile /> <FaPlus />
              </button>
              {folder.path !== '' && (
                <button 
                  className="action-button delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(folder.path);
                  }}
                >
                  <FaTrash />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`snippet-panel ${className || ''}`}>
      <div className="panel-header">
        <h3>Snippets</h3>
        <div className="panel-actions">
          <button 
            onClick={() => {
              setCurrentFolder('');
              setIsCreatingFolder(true);
              setIsCreatingSnippet(false);
            }}
            title="Create Folder"
          >
            <FaFolder /> <FaPlus />
          </button>
          <button 
            onClick={() => {
              setCurrentFolder('');
              setIsCreatingSnippet(true);
              setIsCreatingFolder(false);
            }}
            title="Create Snippet"
          >
            <FaFile /> <FaPlus />
          </button>
          <button 
            onClick={() => setIsSearching(!isSearching)}
            title="Search Snippets"
            className={isSearching ? 'active' : ''}
          >
            <FaSearch />
          </button>
          <button 
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
            title="Reset"
          >
            <FaSync />
          </button>
        </div>
      </div>
      
      {isSearching && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
      )}
      
      <div className="panel-content">
        {isSearching && searchResults.length > 0 ? (
          <div className="search-results">
            <h4>Search Results</h4>
            {searchResults.map(snippet => (
              <div 
                key={snippet.id} 
                className="snippet-item"
                onClick={() => onSelectSnippet && onSelectSnippet(snippet)}
                draggable
                onDragStart={(e) => handleDragStart(e, snippet)}
              >
                <FaFile />
                <span className="snippet-title">{snippet.title}</span>
                <span className="snippet-folder">{snippet.folder}</span>
                <div className="snippet-actions">
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSnippet(snippet);
                    }}
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !isSearching ? (
          <>
            {/* Root level snippets */}
            {(folderStructure[''] || []).map(snippet => (
              <div 
                key={snippet.id} 
                className="snippet-item"
                onClick={() => onSelectSnippet && onSelectSnippet(snippet)}
                draggable
                onDragStart={(e) => handleDragStart(e, snippet)}
              >
                <FaFile />
                <span className="snippet-title">{snippet.title}</span>
                <div className="snippet-actions">
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSnippet(snippet);
                    }}
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="action-button delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSnippet(snippet.id);
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Root level folders */}
            {getSubfolders('').map(folder => renderFolder(folder))}
          </>
        ) : (
          <div className="no-results">No results found</div>
        )}
        
        {/* Create new folder form */}
        {isCreatingFolder && (
          <div className="create-form">
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
            <button onClick={handleCreateFolder}>Create</button>
            <button onClick={() => setIsCreatingFolder(false)}>Cancel</button>
          </div>
        )}
        
        {/* Create new snippet form */}
        {isCreatingSnippet && (
          <div className="create-form">
            <input
              type="text"
              placeholder="Snippet name"
              value={newSnippetName}
              onChange={(e) => setNewSnippetName(e.target.value)}
              autoFocus
            />
            <button onClick={handleCreateSnippet}>Create</button>
            <button onClick={() => setIsCreatingSnippet(false)}>Cancel</button>
          </div>
        )}
      </div>
      
      {/* Edit snippet modal */}
      {editingSnippet && (
        <div className="snippet-edit-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Snippet: {editingSnippet.title}</h3>
              <button onClick={() => setEditingSnippet(null)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                value={editingSnippetContent}
                onChange={(e) => setEditingSnippetContent(e.target.value)}
                rows={15}
              />
            </div>
            <div className="modal-footer">
              <button onClick={handleSaveSnippet}>Save</button>
              <button onClick={() => setEditingSnippet(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnippetPanel;
