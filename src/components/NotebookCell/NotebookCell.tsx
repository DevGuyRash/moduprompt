import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { FaArrowUp, FaArrowDown, FaTrash, FaEdit, FaEye, FaComment, FaCheck, FaCode, FaQuoteRight, FaInfoCircle, FaTag } from 'react-icons/fa';
import MarkdownPreview from '../MarkdownPreview/MarkdownPreview';
import { CellData, CellType, FormatOptions } from '../../contexts/NotebookContext';
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
  const [showFormatMenu, setShowFormatMenu] = React.useState(false);
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

  const applyFormatting = (type: 'code' | 'blockquote' | 'callout' | 'xml', options?: Partial<FormatOptions>) => {
    const formatting: FormatOptions = {
      type,
      ...options
    };
    updateCell(cell.id, { formatting });
    setShowFormatMenu(false);
  };

  const removeFormatting = () => {
    const { formatting, ...rest } = cell;
    updateCell(cell.id, { formatting: undefined });
    setShowFormatMenu(false);
  };

  // Apply formatting to content for rendering
  const getFormattedContent = () => {
    if (!cell.formatting) return cell.content;

    switch (cell.formatting.type) {
      case 'code':
        const language = cell.formatting.language || '';
        return `\`\`\`${language}\n${cell.content}\n\`\`\``;
      case 'blockquote':
        // Add > to each line
        return cell.content.split('\n').map(line => `> ${line}`).join('\n');
      case 'callout':
        const calloutType = cell.formatting.calloutType || 'info';
        return `:::${calloutType}\n${cell.content}\n:::`;
      case 'xml':
        const tag = cell.formatting.xmlTag || 'div';
        return `<${tag}>\n${cell.content}\n</${tag}>`;
      default:
        return cell.content;
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
                 ${groupingMode ? 'grouping-mode' : ''}
                 ${cell.formatting ? `formatted formatted-${cell.formatting.type}` : ''}`}
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
          <MarkdownPreview markdown={getFormattedContent()} />
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
        
        <button
          className="cell-action-button format"
          onClick={() => setShowFormatMenu(!showFormatMenu)}
          title="Format cell"
        >
          {cell.formatting?.type === 'code' ? <FaCode /> : 
           cell.formatting?.type === 'blockquote' ? <FaQuoteRight /> :
           cell.formatting?.type === 'callout' ? <FaInfoCircle /> :
           cell.formatting?.type === 'xml' ? <FaTag /> : <FaCode />}
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
      
      {showFormatMenu && (
        <div className="format-menu">
          <div className="format-menu-header">
            <h4>Format Cell</h4>
            <button onClick={() => setShowFormatMenu(false)}>×</button>
          </div>
          <div className="format-menu-options">
            <button 
              className={`format-option ${cell.formatting?.type === 'code' ? 'active' : ''}`}
              onClick={() => applyFormatting('code', { language: 'javascript' })}
            >
              <FaCode /> Code Block
            </button>
            <button 
              className={`format-option ${cell.formatting?.type === 'blockquote' ? 'active' : ''}`}
              onClick={() => applyFormatting('blockquote')}
            >
              <FaQuoteRight /> Blockquote
            </button>
            <button 
              className={`format-option ${cell.formatting?.type === 'callout' ? 'active' : ''}`}
              onClick={() => applyFormatting('callout', { calloutType: 'info' })}
            >
              <FaInfoCircle /> Callout
            </button>
            <button 
              className={`format-option ${cell.formatting?.type === 'xml' ? 'active' : ''}`}
              onClick={() => applyFormatting('xml', { xmlTag: 'div' })}
            >
              <FaTag /> XML Tags
            </button>
            {cell.formatting && (
              <button 
                className="format-option remove"
                onClick={removeFormatting}
              >
                <FaTrash /> Remove Formatting
              </button>
            )}
          </div>
        </div>
      )}
      
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
