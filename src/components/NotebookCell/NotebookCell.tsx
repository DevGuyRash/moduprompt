import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { FaArrowUp, FaArrowDown, FaTrash, FaEdit, FaEye, FaComment, FaCheck, FaCode, FaQuoteRight, FaInfoCircle, FaTag } from 'react-icons/fa';
import MarkdownPreview from '../MarkdownPreview/MarkdownPreview';
import RichTextBar from '../RichTextBar/RichTextBar';
import { CellData, CellType, FormatOptions } from '../../contexts/NotebookContext';
import './NotebookCell.css';

/**
 * Props for the NotebookCell component
 * @property {CellData} cell - The cell data to render
 * @property {number} index - The index of the cell in the notebook
 * @property {function} updateCell - Function to update cell data
 * @property {function} deleteCell - Function to delete the cell
 * @property {function} moveCell - Function to move the cell up or down
 * @property {function} reorderCells - Function to reorder cells via drag and drop
 * @property {boolean} isSelected - Whether the cell is selected in grouping mode
 * @property {function} onSelect - Function to call when the cell is selected
 * @property {boolean} groupingMode - Whether the notebook is in grouping mode
 */
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

/**
 * Component for rendering a single cell in the notebook
 * Supports editing, formatting, dragging, and other cell operations
 */
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
  const ref = useRef<HTMLDivElement>(null);
  
  // Close format menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFormatMenu && ref.current) {
        // Check if the click target is within the format menu
        const formatMenu = document.querySelector('.format-menu');
        if (formatMenu && !formatMenu.contains(event.target as Node) && !ref.current.contains(event.target as Node)) {
          setShowFormatMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFormatMenu]);
  
  // Set up drag and drop functionality
  const [{ isDragging }, drag] = useDrag({
    type: 'CELL',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !groupingMode, // Disable dragging in grouping mode
  });

  const [{ isOver, isOverTop, isOverBottom }, drop] = useDrop({
    accept: 'CELL',
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
    },
    drop(item: { index: number }, monitor) {
      if (!ref.current) {
        return undefined;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return undefined;
      }

      // Determine drop position (top or bottom half)
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;

      // Dragging downwards, drop after the hovered item
      if (dragIndex < hoverIndex && hoverClientY > hoverMiddleY) {
        reorderCells(dragIndex, hoverIndex);
        return undefined;
      }

      // Dragging upwards, drop before the hovered item
      if (dragIndex > hoverIndex && hoverClientY < hoverMiddleY) {
        reorderCells(dragIndex, hoverIndex);
        return undefined;
      }

      return undefined;
    },
    collect: (monitor) => {
      if (!ref.current) {
        return {
          isOver: false,
          isOverTop: false,
          isOverBottom: false
        };
      }

      // Determine if hovering over top or bottom half
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;
      
      return {
        isOver: monitor.isOver(),
        isOverTop: monitor.isOver() && hoverClientY < hoverMiddleY,
        isOverBottom: monitor.isOver() && hoverClientY > hoverMiddleY
      };
    },
    canDrop: () => !groupingMode, // Disable dropping in grouping mode
  });

  /**
   * Handles changes to the cell content in edit mode
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - The change event
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCell(cell.id, { content: e.target.value });
  };
  
  /**
   * Applies rich text formatting to the selected text in the editor
   * @param {string} formatType - The type of formatting to apply
   * @param {string} formatValue - Optional value for the formatting (e.g., URL for links)
   */
  const handleFormatText = (formatType: string, formatValue?: string) => {
    if (!cell.isEditing) return;
    
    const textarea = document.querySelector(`.notebook-cell[data-id="${cell.id}"] .cell-editor`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (start === end && formatType !== 'unordered-list' && formatType !== 'ordered-list') {
      // No text selected, don't apply formatting
      return;
    }
    
    let formattedText = '';
    let newCursorPos = end;
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        newCursorPos = end + 4;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        newCursorPos = end + 2;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        newCursorPos = end + 4;
        break;
      case 'code-inline':
        formattedText = `\`${selectedText}\``;
        newCursorPos = end + 2;
        break;
      case 'heading':
        // Add heading level (default to h2)
        const level = formatValue || '2';
        const prefix = '#'.repeat(parseInt(level));
        formattedText = `${prefix} ${selectedText}`;
        newCursorPos = end + parseInt(level) + 1;
        break;
      case 'unordered-list':
        // Add bullet points to each line
        if (selectedText) {
          formattedText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
          newCursorPos = start + formattedText.length;
        } else {
          formattedText = '- ';
          newCursorPos = start + 2;
        }
        break;
      case 'ordered-list':
        // Add numbers to each line
        if (selectedText) {
          formattedText = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
          newCursorPos = start + formattedText.length;
        } else {
          formattedText = '1. ';
          newCursorPos = start + 3;
        }
        break;
      case 'link':
        if (formatValue) {
          formattedText = `[${selectedText}](${formatValue})`;
          newCursorPos = start + formattedText.length;
        } else {
          formattedText = `[${selectedText}](url)`;
          newCursorPos = start + selectedText.length + 3;
        }
        break;
      default:
        formattedText = selectedText;
    }
    
    // Update the content
    const newContent = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    updateCell(cell.id, { content: newContent });
    
    // Set cursor position after the operation is complete
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Toggles between edit and view mode for the cell
   */
  const toggleEditMode = () => {
    updateCell(cell.id, { isEditing: !cell.isEditing });
  };

  /**
   * Handles cell selection in grouping mode
   */
  const handleCellClick = () => {
    if (groupingMode && onSelect) {
      onSelect(cell.id);
    }
  };

  /**
   * Applies formatting to the cell
   * @param {string} type - The type of formatting to apply
   * @param {Partial<FormatOptions>} options - Additional formatting options
   */
  const applyFormatting = (type: 'code' | 'blockquote' | 'callout' | 'xml', options?: Partial<FormatOptions>) => {
    const formatting: FormatOptions = {
      type,
      ...options
    };
    updateCell(cell.id, { formatting });
    setShowFormatMenu(false);
  };

  /**
   * Removes formatting from the cell
   */
  const removeFormatting = () => {
    const { formatting, ...rest } = cell;
    updateCell(cell.id, { formatting: undefined });
    setShowFormatMenu(false);
  };

  /**
   * Applies formatting to content for rendering
   * @returns {string} The formatted content
   */
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

  // Initialize drag and drop refs
  drag(drop(ref));

  return (
    <div 
      ref={ref}
      className={`notebook-cell ${cell.type === CellType.COMMENT ? 'comment-cell' : ''} 
                 ${isDragging ? 'dragging' : ''} 
                 ${isOver ? 'drop-target' : ''} 
                 ${isOverTop ? 'drop-target-top' : ''}
                 ${isOverBottom ? 'drop-target-bottom' : ''}
                 ${isSelected ? 'selected' : ''} 
                 ${groupingMode ? 'grouping-mode' : ''}
                 ${cell.formatting ? `formatted formatted-${cell.formatting.type}` : ''}`}
      onClick={handleCellClick}
      data-id={cell.id}
    >
      <div className="cell-handle"></div>
      
      <div className="cell-content">
        {cell.isEditing ? (
          <>
            <RichTextBar onFormatText={handleFormatText} />
            <textarea 
              value={cell.content}
              onChange={handleContentChange}
              className="cell-editor"
            />
          </>
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
