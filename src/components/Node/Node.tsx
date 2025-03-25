import React, { useState, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { FaEdit, FaTrash, FaChevronUp, FaChevronDown, FaUnlink, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
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
  onConnectionStart?: (nodeId: string, handleId: string) => void;
  onConnectionEnd?: (nodeId: string, handleId: string) => void;
  onDisconnect?: (nodeId: string, handleId: string, isInput: boolean) => void;
}

const Node: React.FC<NodeProps> = ({
  node,
  updateNode,
  deleteNode,
  toggleNodeCollapse,
  onDragStart,
  onDragEnd,
  selected = false,
  onSelect,
  onConnectionStart,
  onConnectionEnd,
  onDisconnect
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'NODE',
    item: () => {
      if (onDragStart) onDragStart();
      return { id: node.id };
    },
    end: (item, monitor) => {
      if (onDragEnd) onDragEnd();
      setIsDraggingHandle(false); // Reset dragging state when drag ends
      
      // Fix for persistent dragging state
      if (!monitor.didDrop()) {
        // If the drag ended without a drop, ensure we reset any state
        if (onSelect) {
          onSelect(node.id);
        }
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => !isDraggingHandle, // Prevent node dragging when dragging a handle
  });

  // Connect the drag ref to our node ref
  drag(nodeRef);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(node.id, { content: e.target.value });
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    // Only select the node if we're not clicking on a handle or button
    if (
      !(e.target as HTMLElement).closest('.node-handle') &&
      !(e.target as HTMLElement).closest('button')
    ) {
      e.stopPropagation(); // Stop event from bubbling up to canvas
      if (onSelect) {
        onSelect(node.id);
      }
    }
  };

  const handleConnectionDragStart = (e: React.MouseEvent, handleId: string, isInput: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Only allow dragging from output handles or to input handles
    if (onConnectionStart) {
      setIsDraggingHandle(true);
      onConnectionStart(node.id, handleId);
      
      // Add global mouse move and mouse up event listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    // This is handled by the NodeCanvas component
  };
  
  const handleMouseUp = (e: MouseEvent) => {
    // Clean up event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Reset dragging state
    setIsDraggingHandle(false);
    
    // Find if we're over an input handle
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const inputHandle = element?.closest('.input-handle');
    
    if (inputHandle) {
      const nodeId = inputHandle.closest('[data-node-id]')?.getAttribute('data-node-id');
      const handleId = inputHandle.getAttribute('data-handle-id');
      
      if (nodeId && handleId && onConnectionEnd) {
        onConnectionEnd(nodeId, handleId);
      }
    }
  };

  const handleConnectionDragEnd = (e: React.MouseEvent, handleId: string, isInput: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Only allow connections to input handles
    if (isInput && onConnectionEnd) {
      onConnectionEnd(node.id, handleId);
    }
    
    // Reset dragging state regardless of whether a connection was made
    setIsDraggingHandle(false);
  };
  
  const handleDisconnect = (e: React.MouseEvent, handleId: string, isInput: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onDisconnect) {
      onDisconnect(node.id, handleId, isInput);
    }
  };

  const getNodeTypeLabel = () => {
    switch (node.type) {
      case NodeType.PROMPT:
        return 'Prompt';
      case NodeType.FILTER:
        return 'Filter';
      case NodeType.FORMAT:
        return 'Format';
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
      case NodeType.FORMAT:
        return 'format-node';
      case NodeType.FILTER_JOIN:
        return 'filter-join-node';
      default:
        return '';
    }
  };

  // Filter and Format nodes should not be editable
  const isEditableNode = node.type === NodeType.PROMPT || node.type === NodeType.FILTER_JOIN;

  return (
    <div 
      ref={nodeRef}
      className={`node ${getNodeTypeClass()} ${isDragging ? 'dragging' : ''} ${selected ? 'selected' : ''}`}
      style={{ 
        left: node.position.x, 
        top: node.position.y,
        opacity: isDragging ? 0.5 : 1 
      }}
      onClick={handleNodeClick}
      data-node-id={node.id}
    >
      <div className="node-header">
        <div className="node-type">{getNodeTypeLabel()}</div>
        <div className="node-actions">
          {isEditableNode && (
            <button 
              className="node-action-button"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "View mode" : "Edit mode"}
            >
              <FaEdit />
            </button>
          )}
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
          {isEditing && isEditableNode ? (
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
      
      {node.inputs.length > 0 && (
        <div className="node-io-section-label node-inputs-label">
          <FaArrowRight /> Inputs
        </div>
      )}
      
      <div className="node-inputs">
        {node.inputs.map(input => (
          <div key={input} className="node-handle-container">
            <div 
              className="node-handle input-handle" 
              data-handle-id={input}
              onMouseDown={(e) => handleConnectionDragStart(e, input, true)}
              onMouseUp={(e) => handleConnectionDragEnd(e, input, true)}
              title={`Input: ${input}`}
            >
              <span className="handle-label">{input}</span>
            </div>
            <button 
              className="disconnect-button"
              onClick={(e) => handleDisconnect(e, input, true)}
              title="Disconnect input"
            >
              <FaUnlink size={10} />
            </button>
          </div>
        ))}
      </div>
      
      {node.outputs.length > 0 && (
        <div className="node-io-section-label node-outputs-label">
          Outputs <FaArrowLeft />
        </div>
      )}
      
      <div className="node-outputs">
        {node.outputs.map(output => (
          <div key={output} className="node-handle-container">
            <div 
              className="node-handle output-handle" 
              data-handle-id={output}
              onMouseDown={(e) => handleConnectionDragStart(e, output, false)}
              title={`Output: ${output}`}
            >
              <span className="handle-label">{output}</span>
            </div>
            <button 
              className="disconnect-button"
              onClick={(e) => handleDisconnect(e, output, false)}
              title="Disconnect output"
            >
              <FaUnlink size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Node;
