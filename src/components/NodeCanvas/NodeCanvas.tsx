import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { NodeData, NodeConnection, NodeType, useNodeEditor } from '../../contexts/NodeEditorContext';
import Node from '../Node/Node';
import { FaPlus, FaFilter, FaObjectGroup } from 'react-icons/fa';
import './NodeCanvas.css';

interface ConnectionLineProps {
  connection: NodeConnection;
  nodes: NodeData[];
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ connection, nodes }) => {
  const sourceNode = nodes.find(node => node.id === connection.sourceId);
  const targetNode = nodes.find(node => node.id === connection.targetId);
  
  if (!sourceNode || !targetNode) return null;
  
  // Find the DOM elements for the handles
  const sourceElement = document.querySelector(
    `[data-node-id="${connection.sourceId}"] [data-handle-id="${connection.sourceHandle}"]`
  );
  const targetElement = document.querySelector(
    `[data-node-id="${connection.targetId}"] [data-handle-id="${connection.targetHandle}"]`
  );
  
  if (!sourceElement || !targetElement) return null;
  
  // Get the positions of the handles
  const sourceRect = sourceElement.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const canvasRect = document.querySelector('.node-canvas')?.getBoundingClientRect();
  
  if (!canvasRect) return null;
  
  const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
  const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
  const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
  const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
  
  // Create a bezier curve path
  const path = `M ${sourceX},${sourceY} C ${sourceX},${sourceY + 50} ${targetX},${targetY - 50} ${targetX},${targetY}`;
  
  return (
    <svg className="connection-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <path d={path} stroke="#6c757d" strokeWidth="2" fill="none" />
    </svg>
  );
};

const NodeCanvas: React.FC = () => {
  const { 
    nodes, 
    connections, 
    addNode, 
    updateNode, 
    deleteNode, 
    moveNode,
    toggleNodeCollapse,
    addConnection,
    deleteConnection
  } = useNodeEditor();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, handleId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [{ isOver }, drop] = useDrop({
    accept: 'NODE',
    drop: (item: { id: string }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta && item.id) {
        const node = nodes.find(n => n.id === item.id);
        if (node) {
          const x = Math.round(node.position.x + delta.x);
          const y = Math.round(node.position.y + delta.y);
          moveNode(item.id, { x, y });
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on the canvas, not on nodes
    if (e.target === canvasRef.current) {
      setSelectedNodeId(null);
    }
  };
  
  const handleNodeSelect = (id: string) => {
    setSelectedNodeId(id);
  };
  
  const handleAddNode = (type: NodeType) => {
    // Add node at the center of the canvas
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const x = (canvasRect.width / 2) - 140; // Half of node width
      const y = (canvasRect.height / 2) - 100; // Arbitrary height
      addNode(type, { x, y });
    }
  };
  
  const handleConnectionStart = (nodeId: string, handleId: string) => {
    setConnectionStart({ nodeId, handleId });
    setIsDraggingConnection(true);
  };
  
  const handleConnectionEnd = (nodeId: string, handleId: string) => {
    if (connectionStart && connectionStart.nodeId !== nodeId) {
      // Create a new connection
      addConnection({
        sourceId: connectionStart.nodeId,
        targetId: nodeId,
        sourceHandle: connectionStart.handleId,
        targetHandle: handleId
      });
    }
    setConnectionStart(null);
    setIsDraggingConnection(false);
  };
  
  return (
    <div 
      ref={(node) => {
        const result = drop(node);
        return undefined;
      }}
      className={`node-canvas ${isOver ? 'canvas-drop-active' : ''}`}
      onClick={handleCanvasClick}
    >
      <div className="canvas-toolbar">
        <button 
          className="toolbar-button"
          onClick={() => handleAddNode(NodeType.PROMPT)}
          title="Add prompt node"
        >
          <FaPlus /> Prompt
        </button>
        <button 
          className="toolbar-button"
          onClick={() => handleAddNode(NodeType.FILTER)}
          title="Add filter node"
        >
          <FaFilter /> Filter
        </button>
        <button 
          className="toolbar-button"
          onClick={() => handleAddNode(NodeType.FILTER_JOIN)}
          title="Add filter join node"
        >
          <FaObjectGroup /> Filter Join
        </button>
      </div>
      
      <div className="canvas-content" ref={canvasRef}>
        {nodes.map(node => (
          <div key={node.id} data-node-id={node.id}>
            <Node 
              node={node}
              updateNode={updateNode}
              deleteNode={deleteNode}
              toggleNodeCollapse={toggleNodeCollapse}
              selected={selectedNodeId === node.id}
              onSelect={handleNodeSelect}
            />
          </div>
        ))}
        
        {connections.map(connection => (
          <ConnectionLine 
            key={`${connection.sourceId}-${connection.targetId}`}
            connection={connection}
            nodes={nodes}
          />
        ))}
      </div>
    </div>
  );
};

export default NodeCanvas;
