import React, { useState } from 'react';
import { FaPlus, FaFilter, FaObjectGroup } from 'react-icons/fa';
import { NodeType, FormatOptions } from '../../contexts/NodeEditorContext';
import './FilterJoinNode.css';

interface FilterJoinNodeProps {
  id: string;
  content: string;
  isEditing: boolean;
  onContentChange: (id: string, content: string) => void;
  onToggleEdit: () => void;
}

const FilterJoinNode: React.FC<FilterJoinNodeProps> = ({ 
  id, 
  content, 
  isEditing, 
  onContentChange,
  onToggleEdit
}) => {
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(id, e.target.value);
  };

  return (
    <div className="filter-join-node" data-node-id={id}>
      <div className="filter-join-node-header">
        <span className="filter-join-node-type">Filter Join</span>
        <div className="filter-join-node-icon">
          <FaObjectGroup />
        </div>
      </div>
      
      <div className="filter-join-node-content">
        {isEditing ? (
          <textarea 
            value={content}
            onChange={handleContentChange}
            className="filter-join-node-editor"
            placeholder="Enter join logic or description..."
          />
        ) : (
          <div className="filter-join-node-preview">
            {content || "Combines multiple filter inputs into a single output"}
          </div>
        )}
      </div>
      
      <div className="filter-join-node-handles">
        <div className="input-handle input1-handle" data-handle-id="input1" title="Input 1" />
        <div className="input-handle input2-handle" data-handle-id="input2" title="Input 2" />
        <div className="output-handle" data-handle-id="output" title="Output" />
      </div>
    </div>
  );
};

export default FilterJoinNode;
