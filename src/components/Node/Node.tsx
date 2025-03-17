import React from 'react';
import { useDrag } from 'react-dnd';
import { FaEdit, FaTrash, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { NodeData, NodeType } from '../../contexts/NodeEditorContext';
import MarkdownPreview from '../MarkdownPreview/MarkdownPreview';
import './Node.css';

interface NodeProps {
  node: NodeData;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  toggleNodeCollapse: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const Node: React.FC<NodeProps> = ({
  node,
  updateNode,
  deleteNode,
  toggleNodeCollapse,
  onDragStart,
  onDragEnd,
  selected = false,
  onSelect
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'NODE',
    item: () => {
      if (onDragStart) onDragStart();
      return { id: node.id };
    },
    end: () => {
      if (onDragEnd) onDragEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(node.id, { content: e.target.value });
  };

  const handleNodeClick = () => {
    if (onSelect) {
      onSelect(node.id);
    }
  };

  const getNodeTypeLabel = () => {
    switch (node.type) {
      case NodeType.PROMPT:
        return 'Prompt';
      case NodeType.FILTER:
        return 'Filter';
      case NodeType.FILTER_JOIN:
        return 'Filter Join';
      default:
        return 'Node';
    }
  };

  const getNodeTypeClass = () => {
    switch (node.type) {
      case NodeType.PROMPT:
        return 'prompt-node';
      case NodeType.FILTER:
        return 'filter-node';
      case NodeType.FILTER_JOIN:
        return 'filter-join-node';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={drag}
      className={`node ${getNodeTypeClass()} ${isDragging ? 'dragging' : ''} ${selected ? 'selected' : ''}`}
      style={{ 
        left: node.position.x, 
        top: node.position.y,
        opacity: isDragging ? 0.5 : 1 
      }}
      onClick={handleNodeClick}
    >
      <div className="node-header">
        <div className="node-type">{getNodeTypeLabel()}</div>
        <div className="node-actions">
          <button 
            className="node-action-button"
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? "View mode" : "Edit mode"}
          >
            <FaEdit />
          </button>
          <button 
            className="node-action-button"
            onClick={() => toggleNodeCollapse(node.id)}
            title={node.isCollapsed ? "Expand" : "Collapse"}
          >
            {node.isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
          <button 
            className="node-action-button delete"
            onClick={() => deleteNode(node.id)}
            title="Delete node"
          >
            <FaTrash />
          </button>
        </div>
      </div>
      
      {!node.isCollapsed && (
        <div className="node-content">
          {isEditing ? (
            <textarea 
              value={node.content}
              onChange={handleContentChange}
              className="node-editor"
            />
          ) : (
            <MarkdownPreview markdown={node.content} />
          )}
        </div>
      )}
      
      <div className="node-inputs">
        {node.inputs.map(input => (
          <div key={input} className="node-handle input-handle" data-handle-id={input} />
        ))}
      </div>
      
      <div className="node-outputs">
        {node.outputs.map(output => (
          <div key={output} className="node-handle output-handle" data-handle-id={output} />
        ))}
      </div>
    </div>
  );
};

export default Node;
