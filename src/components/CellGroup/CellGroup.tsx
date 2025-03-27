import React, { useState } from 'react';
import { CellData, CellType, useNotebook } from '../../contexts/NotebookContext';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import './CellGroup.css';

interface CellGroupProps {
  cells: CellData[];
  startIndex: number;
  endIndex: number;
}

const CellGroup: React.FC<CellGroupProps> = ({ cells, startIndex, endIndex }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { updateCell, deleteCell, moveCell, reorderCells } = useNotebook();
  
  const groupCells = cells.slice(startIndex, endIndex + 1);
  const hasCommentCells = groupCells.some(cell => cell.type === CellType.COMMENT);
  const hasContentCells = groupCells.some(cell => cell.type === CellType.CONTENT);
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <div className={`cell-group ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="group-header" onClick={toggleCollapse}>
        {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
        <span className="group-title">
          Group ({endIndex - startIndex + 1} cells)
          {hasCommentCells && hasContentCells && " - Mixed"}
          {hasCommentCells && !hasContentCells && " - Comments"}
          {!hasCommentCells && hasContentCells && " - Content"}
        </span>
      </div>
      
      {!isCollapsed && (
        <div className="group-content">
          {groupCells.map((cell, idx) => (
            <div key={cell.id} className="group-cell">
              {/* Import and use NotebookCell component to render each cell */}
              {React.createElement(require('../NotebookCell/NotebookCell').default, {
                cell,
                index: startIndex + idx,
                updateCell,
                deleteCell,
                moveCell,
                reorderCells
              })}
            </div>
          ))}
        </div>
      )}
      
      {isCollapsed && (
        <div className="group-summary">
          {hasCommentCells && <span className="group-badge comment">Comments</span>}
          {hasContentCells && <span className="group-badge content">Content</span>}
          <span className="group-count">{endIndex - startIndex + 1} cells</span>
        </div>
      )}
    </div>
  );
};

export default CellGroup;
