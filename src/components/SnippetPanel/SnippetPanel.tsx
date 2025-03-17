import React, { useState } from 'react';
import { FolderType, SnippetType } from '../../types/snippet';
import { useSnippets } from '../../contexts/SnippetContext';
import { FaFolder, FaFolderOpen, FaFile, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import './SnippetPanel.css';
import { extractFolderPaths, createNewSnippet } from '../../utils/frontmatter';

interface SnippetPanelProps {
  onSelectSnippet?: (snippet: SnippetType) => void;
  className?: string;
}

const SnippetPanel: React.FC<SnippetPanelProps> = ({ onSelectSnippet, className }) => {
  const { snippets, folders, addSnippet, deleteSnippet, addFolder, deleteFolder } = useSnippets();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [newSnippetName, setNewSnippetName] = useState('');
  const [currentFolder, setCurrentFolder] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingSnippet, setIsCreatingSnippet] = useState(false);

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
      if (structure[snippet.folder]) {
        structure[snippet.folder].push(snippet);
      } else {
        // If folder doesn't exist yet, create it
        structure[snippet.folder] = [snippet];
        // Ensure all parent folders exist
        extractFolderPaths(snippet.folder).forEach(path => {
          if (!structure[path]) {
            structure[path] = [];
          }
        });
      }
    });
    
    return structure;
  }, [snippets, folders]);

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
        path,
        name: path.split('/').pop() || '',
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
      '---\ntitle: ' + newSnippetName.trim() + '\n---\n\n',
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
              >
                <FaFile />
                <span className="snippet-title">{snippet.title}</span>
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSnippet(snippet.id);
                  }}
                >
                  <FaTrash />
                </button>
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
          >
            <FaFolder /> <FaPlus />
          </button>
          <button 
            onClick={() => {
              setCurrentFolder('');
              setIsCreatingSnippet(true);
              setIsCreatingFolder(false);
            }}
          >
            <FaFile /> <FaPlus />
          </button>
        </div>
      </div>
      
      <div className="panel-content">
        {/* Root level snippets */}
        {(folderStructure[''] || []).map(snippet => (
          <div 
            key={snippet.id} 
            className="snippet-item"
            onClick={() => onSelectSnippet && onSelectSnippet(snippet)}
          >
            <FaFile />
            <span className="snippet-title">{snippet.title}</span>
            <button 
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                deleteSnippet(snippet.id);
              }}
            >
              <FaTrash />
            </button>
          </div>
        ))}
        
        {/* Root level folders */}
        {getSubfolders('').map(folder => renderFolder(folder))}
        
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
    </div>
  );
};

export default SnippetPanel;
