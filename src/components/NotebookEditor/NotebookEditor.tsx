import React, { useState } from 'react';
import { useNotebook, CellType } from '../../contexts/NotebookContext';
import NotebookCell from '../NotebookCell/NotebookCell';
import CellGroup from '../CellGroup/CellGroup';
import { FaPlus, FaComment, FaEye, FaEyeSlash, FaObjectGroup } from 'react-icons/fa';
import './NotebookEditor.css';

interface NotebookEditorProps {
  onSelectCell?: (cellId: string | null) => void;
}

const NotebookEditor: React.FC<NotebookEditorProps> = ({ onSelectCell }) => {
  const { 
    cells, 
    addCell, 
    updateCell, 
    deleteCell, 
    moveCell, 
    reorderCells,
    showComments,
    toggleShowComments
  } = useNotebook();
  
  const [groupingMode, setGroupingMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [cellGroups, setCellGroups] = useState<Array<{start: number, end: number}>>([]);
  
  // Filter cells based on showComments setting
  const visibleCells = cells.filter(cell => showComments || cell.type !== CellType.COMMENT);
  
  const toggleCellSelection = (cellId: string, multiMode: boolean) => {
    if (groupingMode) {
      const newSelection = new Set(selectedCells);
      if (selectedCells.has(cellId)) {
        newSelection.delete(cellId);
      } else {
        newSelection.add(cellId);
      }
      setSelectedCells(newSelection);
    }
    
    // Notify parent about cell selection
    if (onSelectCell) {
      onSelectCell(cellId);
    }
  };

  const createGroup = () => {
    if (selectedCells.size < 2) return;
    
    // Find indices of selected cells
    const selectedIndices = Array.from(selectedCells).map(id => 
      visibleCells.findIndex(cell => cell.id === id)
    ).filter(index => index !== -1).sort((a, b) => a - b);
    
    // Check if cells are consecutive
    let isConsecutive = true;
    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== selectedIndices[i-1] + 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (!isConsecutive) {
      alert("Only consecutive cells can be grouped together");
      return;
    }
    
    // Add new group
    setCellGroups([...cellGroups, {
      start: selectedIndices[0],
      end: selectedIndices[selectedIndices.length - 1]
    }]);
    
    // Clear selection
    setSelectedCells(new Set());
    setGroupingMode(false);
  };

  const renderCellOrGroup = (index: number) => {
    // Check if this index is part of a group
    const group = cellGroups.find(g => index >= g.start && index <= g.end);
    
    if (group && index === group.start) {
      // Render the group at the start index
      return (
        <CellGroup 
          key={`group-${group.start}-${group.end}`}
          cells={visibleCells}
          startIndex={group.start}
          endIndex={group.end}
        />
      );
    } else if (group) {
      // Skip rendering cells that are part of a group but not the start
      return null;
    } else {
      // Render individual cell
      const cell = visibleCells[index];
      return (
        <NotebookCell
          key={cell.id}
          cell={cell}
          index={index}
          updateCell={updateCell}
          deleteCell={deleteCell}
          moveCell={moveCell}
          reorderCells={reorderCells}
          isSelected={selectedCells.has(cell.id)}
          onSelect={toggleCellSelection}
          groupingMode={groupingMode}
        />
      );
    }
  };

  return (
    <div className="notebook-editor-container">
      <div className="notebook-toolbar">
        <div className="toolbar-actions">
          <button 
            className="toolbar-button"
            onClick={() => addCell(CellType.CONTENT)}
            title="Add content cell"
          >
            <FaPlus /> Content
          </button>
          <button 
            className="toolbar-button"
            onClick={() => addCell(CellType.COMMENT)}
            title="Add comment cell"
          >
            <FaComment /> Comment
          </button>
          <button 
            className={`toolbar-button ${groupingMode ? 'active' : ''}`}
            onClick={() => {
              if (groupingMode && selectedCells.size >= 2) {
                createGroup();
              } else {
                setGroupingMode(!groupingMode);
                setSelectedCells(new Set());
              }
            }}
            title={groupingMode ? "Create group from selection" : "Enter grouping mode"}
          >
            <FaObjectGroup /> {groupingMode ? "Create Group" : "Group Cells"}
          </button>
        </div>
        <div className="toolbar-view-options">
          <button 
            className={`toolbar-button ${showComments ? 'active' : ''}`}
            onClick={toggleShowComments}
            title={showComments ? "Hide comments" : "Show comments"}
          >
            {showComments ? <FaEye /> : <FaEyeSlash />} Comments
          </button>
        </div>
      </div>
      <div className={`notebook-cells ${groupingMode ? 'grouping-mode' : ''}`}>
        {visibleCells.length === 0 ? (
          <div className="empty-notebook">
            <p>No cells yet. Add a cell to get started!</p>
            <div className="empty-actions">
              <button 
                className="empty-action-button"
                onClick={() => addCell(CellType.CONTENT)}
              >
                <FaPlus /> Add Content Cell
              </button>
              <button 
                className="empty-action-button"
                onClick={() => addCell(CellType.COMMENT)}
              >
                <FaComment /> Add Comment Cell
              </button>
            </div>
          </div>
        ) : (
          Array.from({ length: visibleCells.length }).map((_, index) => 
            renderCellOrGroup(index)
          )
        )}
      </div>
      {visibleCells.length > 0 && (
        <div className="add-cell-bottom">
          <button 
            className="add-cell-button"
            onClick={() => addCell(CellType.CONTENT)}
            title="Add content cell"
          >
            <FaPlus />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotebookEditor;
