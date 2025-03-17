import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { FaArrowUp, FaArrowDown, FaTrash, FaEdit, FaEye, FaComment, FaCheck } from 'react-icons/fa';
import MarkdownPreview from '../MarkdownPreview/MarkdownPreview';
import { CellData, CellType } from '../../contexts/NotebookContext';
import './NotebookCell.css';

interface NotebookCellProps {
  cell: CellData;
  index: number;
  updateCell: (id: string, data: Partial<CellData>) => void;
  deleteCell: (id: string) => void;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  reorderCells: (sourceIndex: number, targetIndex: number) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  groupingMode?: boolean;
}

const NotebookCell: React.FC<NotebookCellProps> = ({
  cell,
  index,
  updateCell,
  deleteCell,
  moveCell,
  reorderCells,
  isSelected = false,
  onSelect,
  groupingMode = false
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'CELL',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !groupingMode, // Disable dragging in grouping mode
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'CELL',
    drop: (item: { index: number }, monitor) => {
      reorderCells(item.index, index);
      return true;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
    canDrop: () => !groupingMode, // Disable dropping in grouping mode
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCell(cell.id, { content: e.target.value });
  };

  const toggleEditMode = () => {
    updateCell(cell.id, { isEditing: !cell.isEditing });
  };

  const handleCellClick = () => {
    if (groupingMode && onSelect) {
      onSelect(cell.id);
    }
  };

  return (
    <div 
      ref={(node) => {
        const result = drag(drop(node));
        return undefined;
      }}
      className={`notebook-cell ${cell.type === CellType.COMMENT ? 'comment-cell' : ''} 
                 ${isDragging ? 'dragging' : ''} 
                 ${isOver ? 'drop-target' : ''} 
                 ${isSelected ? 'selected' : ''} 
                 ${groupingMode ? 'grouping-mode' : ''}`}
      onClick={handleCellClick}
    >
      <div className="cell-handle"></div>
      
      <div className="cell-content">
        {cell.isEditing ? (
          <textarea 
            value={cell.content}
            onChange={handleContentChange}
            className="cell-editor"
          />
        ) : (
          <MarkdownPreview markdown={cell.content} />
        )}
      </div>
      
      <div className="cell-actions">
        <button 
          className="cell-action-button toggle-mode"
          onClick={toggleEditMode}
          title={cell.isEditing ? "View mode" : "Edit mode"}
        >
          {cell.isEditing ? <FaEye /> : <FaEdit />}
        </button>
        
        {!groupingMode && (
          <>
            <button 
              className="cell-action-button move-up"
              onClick={() => moveCell(cell.id, 'up')}
              disabled={index === 0}
              title="Move up"
            >
              <FaArrowUp />
            </button>
            
            <button 
              className="cell-action-button move-down"
              onClick={() => moveCell(cell.id, 'down')}
              title="Move down"
            >
              <FaArrowDown />
            </button>
            
            <button 
              className="cell-action-button delete"
              onClick={() => deleteCell(cell.id)}
              title="Delete cell"
            >
              <FaTrash />
            </button>
          </>
        )}
      </div>
      
      {cell.type === CellType.COMMENT && (
        <div className="cell-type-indicator">
          <FaComment />
        </div>
      )}

      {groupingMode && (
        <div className="cell-selection-indicator">
          {isSelected ? <FaCheck /> : null}
        </div>
      )}
    </div>
  );
};

export default NotebookCell;
