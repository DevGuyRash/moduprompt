import React from 'react';
import { SnippetType } from '../types/snippet';

/**
 * Enum representing the different types of cells in the notebook
 */
export enum CellType {
  CONTENT = 'content',
  COMMENT = 'comment'
}

/**
 * Interface for cell formatting options
 * @property {string} type - The type of formatting to apply
 * @property {string} language - The programming language for code blocks
 * @property {string} calloutType - The type of callout (info, warning, success, error)
 * @property {string} xmlTag - The XML tag to wrap content with
 */
export interface FormatOptions {
  type?: 'code' | 'blockquote' | 'callout' | 'xml';
  language?: string;
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  xmlTag?: string;
}

/**
 * Interface representing a cell in the notebook
 * @property {string} id - Unique identifier for the cell
 * @property {CellType} type - Type of the cell (content or comment)
 * @property {string} content - Text content of the cell
 * @property {boolean} isEditing - Whether the cell is in edit mode
 * @property {FormatOptions} formatting - Optional formatting options for the cell
 */
export interface CellData {
  id: string;
  type: CellType;
  content: string;
  isEditing: boolean;
  formatting?: FormatOptions;
}

/**
 * Interface for the Notebook context
 */
interface NotebookContextType {
  cells: CellData[];
  addCell: (type: CellType, content?: string, index?: number) => void;
  updateCell: (id: string, data: Partial<CellData>) => void;
  deleteCell: (id: string) => void;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  reorderCells: (sourceIndex: number, targetIndex: number) => void;
  insertSnippet: (snippet: SnippetType, index?: number) => void;
  formatCell: (id: string, formatting: FormatOptions) => void;
  removeFormatting: (id: string) => void;
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
  formatCell: () => {},
  removeFormatting: () => {},
  showComments: true,
  toggleShowComments: () => {}
};

export const NotebookContext = React.createContext<NotebookContextType>(defaultContext);

/**
 * Provider component for the Notebook context
 * Manages the state and operations for notebook cells
 */
export const NotebookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cells, setCells] = React.useState<CellData[]>([]);
  const [showComments, setShowComments] = React.useState(true);

  /**
   * Generates a unique ID for a new cell
   * @returns {string} A random string ID
   */
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  /**
   * Adds a new cell to the notebook
   * @param {CellType} type - The type of cell to add
   * @param {string} content - The initial content of the cell
   * @param {number} index - Optional index to insert the cell at
   */
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

  /**
   * Updates an existing cell with new data
   * @param {string} id - The ID of the cell to update
   * @param {Partial<CellData>} data - The data to update the cell with
   */
  const updateCell = (id: string, data: Partial<CellData>) => {
    setCells(prev => 
      prev.map(cell => 
        cell.id === id ? { ...cell, ...data } : cell
      )
    );
  };

  /**
   * Deletes a cell from the notebook
   * @param {string} id - The ID of the cell to delete
   */
  const deleteCell = (id: string) => {
    setCells(prev => prev.filter(cell => cell.id !== id));
  };

  /**
   * Moves a cell up or down in the notebook
   * @param {string} id - The ID of the cell to move
   * @param {string} direction - The direction to move the cell ('up' or 'down')
   */
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

  /**
   * Reorders cells by moving a cell from one index to another
   * @param {number} sourceIndex - The index of the cell to move
   * @param {number} targetIndex - The index to move the cell to
   */
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

  /**
   * Inserts a snippet as a new cell in the notebook
   * @param {SnippetType} snippet - The snippet to insert
   * @param {number} index - Optional index to insert the snippet at
   */
  const insertSnippet = (snippet: SnippetType, index?: number) => {
    // Remove frontmatter from content when inserting
    const { content: snippetContent } = snippet;
    addCell(CellType.CONTENT, snippetContent, index);
  };

  /**
   * Applies formatting to a cell
   * @param {string} id - The ID of the cell to format
   * @param {FormatOptions} formatting - The formatting options to apply
   */
  const formatCell = (id: string, formatting: FormatOptions) => {
    setCells(prev => 
      prev.map(cell => 
        cell.id === id ? { ...cell, formatting } : cell
      )
    );
  };

  /**
   * Removes formatting from a cell
   * @param {string} id - The ID of the cell to remove formatting from
   */
  const removeFormatting = (id: string) => {
    setCells(prev => 
      prev.map(cell => {
        if (cell.id === id) {
          const { formatting, ...rest } = cell;
          return rest;
        }
        return cell;
      })
    );
  };

  /**
   * Toggles the visibility of comment cells
   */
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
        formatCell,
        removeFormatting,
        showComments,
        toggleShowComments
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
};

/**
 * Hook to access the Notebook context
 * @returns {NotebookContextType} The Notebook context
 */
export const useNotebook = () => React.useContext(NotebookContext);
