import React from 'react';
import { SnippetType } from '../../types/snippet';

interface SnippetContextType {
  snippets: SnippetType[];
  folders: string[];
  addSnippet: (snippet: SnippetType) => void;
  updateSnippet: (id: string, snippet: Partial<SnippetType>) => void;
  deleteSnippet: (id: string) => void;
  addFolder: (path: string) => void;
  deleteFolder: (path: string) => void;
}

const defaultContext: SnippetContextType = {
  snippets: [],
  folders: [],
  addSnippet: () => {},
  updateSnippet: () => {},
  deleteSnippet: () => {},
  addFolder: () => {},
  deleteFolder: () => {},
};

export const SnippetContext = React.createContext<SnippetContextType>(defaultContext);

export const SnippetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snippets, setSnippets] = React.useState<SnippetType[]>([]);
  const [folders, setFolders] = React.useState<string[]>([]);

  const addSnippet = (snippet: SnippetType) => {
    setSnippets(prev => [...prev, snippet]);
  };

  const updateSnippet = (id: string, updatedSnippet: Partial<SnippetType>) => {
    setSnippets(prev => 
      prev.map(snippet => 
        snippet.id === id ? { ...snippet, ...updatedSnippet } : snippet
      )
    );
  };

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(snippet => snippet.id !== id));
  };

  const addFolder = (path: string) => {
    if (!folders.includes(path)) {
      setFolders(prev => [...prev, path]);
    }
  };

  const deleteFolder = (path: string) => {
    setFolders(prev => prev.filter(folder => folder !== path && !folder.startsWith(`${path}/`)));
    // Also remove snippets in this folder
    setSnippets(prev => prev.filter(snippet => !snippet.folder.startsWith(path)));
  };

  return (
    <SnippetContext.Provider 
      value={{ 
        snippets, 
        folders, 
        addSnippet, 
        updateSnippet, 
        deleteSnippet, 
        addFolder, 
        deleteFolder 
      }}
    >
      {children}
    </SnippetContext.Provider>
  );
};

export const useSnippets = () => React.useContext(SnippetContext);
