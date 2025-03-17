import React from 'react';
import { SnippetType } from '../types/snippet';

export enum CellType {
  CONTENT = 'content',
  COMMENT = 'comment'
}

export interface CellData {
  id: string;
  type: CellType;
  content: string;
  isEditing: boolean;
}

interface NotebookContextType {
  cells: CellData[];
  addCell: (type: CellType, content?: string, index?: number) => void;
  updateCell: (id: string, data: Partial<CellData>) => void;
  deleteCell: (id: string) => void;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  reorderCells: (sourceIndex: number, targetIndex: number) => void;
  insertSnippet: (snippet: SnippetType, index?: number) => void;
  showComments: boolean;
  toggleShowComments: () => void;
}

const defaultContext: NotebookContextType = {
  cells: [],
  addCell: () => {},
  updateCell: () => {},
  deleteCell: () => {},
  moveCell: () => {},
  reorderCells: () => {},
  insertSnippet: () => {},
  showComments: true,
  toggleShowComments: () => {}
};

export const NotebookContext = React.createContext<NotebookContextType>(defaultContext);

export const NotebookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cells, setCells] = React.useState<CellData[]>([]);
  const [showComments, setShowComments] = React.useState(true);

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const addCell = (type: CellType, content: string = '', index?: number) => {
    const newCell: CellData = {
      id: generateId(),
      type,
      content,
      isEditing: true
    };

    setCells(prev => {
      if (index !== undefined && index >= 0 && index <= prev.length) {
        const newCells = [...prev];
        newCells.splice(index, 0, newCell);
        return newCells;
      }
      return [...prev, newCell];
    });
  };

  const updateCell = (id: string, data: Partial<CellData>) => {
    setCells(prev => 
      prev.map(cell => 
        cell.id === id ? { ...cell, ...data } : cell
      )
    );
  };

  const deleteCell = (id: string) => {
    setCells(prev => prev.filter(cell => cell.id !== id));
  };

  const moveCell = (id: string, direction: 'up' | 'down') => {
    setCells(prev => {
      const index = prev.findIndex(cell => cell.id === id);
      if (index === -1) return prev;

      const newCells = [...prev];
      if (direction === 'up' && index > 0) {
        [newCells[index], newCells[index - 1]] = [newCells[index - 1], newCells[index]];
      } else if (direction === 'down' && index < prev.length - 1) {
        [newCells[index], newCells[index + 1]] = [newCells[index + 1], newCells[index]];
      }
      return newCells;
    });
  };

  const reorderCells = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= cells.length ||
      targetIndex >= cells.length
    ) {
      return;
    }

    setCells(prev => {
      const newCells = [...prev];
      const [movedCell] = newCells.splice(sourceIndex, 1);
      newCells.splice(targetIndex, 0, movedCell);
      return newCells;
    });
  };

  const insertSnippet = (snippet: SnippetType, index?: number) => {
    // Remove frontmatter from content when inserting
    const { content: snippetContent } = snippet;
    addCell(CellType.CONTENT, snippetContent, index);
  };

  const toggleShowComments = () => {
    setShowComments(prev => !prev);
  };

  return (
    <NotebookContext.Provider 
      value={{ 
        cells, 
        addCell, 
        updateCell, 
        deleteCell, 
        moveCell,
        reorderCells,
        insertSnippet,
        showComments,
        toggleShowComments
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
};

export const useNotebook = () => React.useContext(NotebookContext);
