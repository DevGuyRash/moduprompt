import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { NodeData, NodeConnection, NodeType, useNodeEditor } from '../../contexts/NodeEditorContext';
import Node from '../Node/Node';
import { FaPlus, FaFilter, FaObjectGroup, FaCode, FaSearchMinus, FaSearchPlus, FaHome } from 'react-icons/fa';
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
  const path = `M ${sourceX},${sourceY} C ${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
  
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
  const [temporaryConnection, setTemporaryConnection] = useState<{ sourceX: number, sourceY: number, targetX: number, targetY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [{ isOver }, drop] = useDrop({
    accept: 'NODE',
    drop: (item: { id: string }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta && item.id) {
        const node = nodes.find(n => n.id === item.id);
        if (node) {
          const x = Math.round(node.position.x + delta.x / scale);
          const y = Math.round(node.position.y + delta.y / scale);
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
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if it's a middle mouse button or right click on the canvas itself
    if ((e.button === 1 || e.button === 2) && e.target === canvasRef.current) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({
        x: position.x + dx,
        y: position.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    
    // Update temporary connection line if dragging a connection
    if (isDraggingConnection && connectionStart) {
      const sourceElement = document.querySelector(
        `[data-node-id="${connectionStart.nodeId}"] [data-handle-id="${connectionStart.handleId}"]`
      );
      
      if (sourceElement) {
        const sourceRect = sourceElement.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        
        if (canvasRect) {
          const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
          const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
          const targetX = e.clientX - canvasRect.left;
          const targetY = e.clientY - canvasRect.top;
          
          setTemporaryConnection({ sourceX, sourceY, targetX, targetY });
        }
      }
    }
  };
  
  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
      setTemporaryConnection(null);
    }
  };
  
  const handleNodeSelect = (id: string) => {
    setSelectedNodeId(id);
  };
  
  const handleAddNode = (type: NodeType) => {
    // Add node at the center of the canvas
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const x = (canvasRect.width / 2 - 140) / scale - position.x; // Half of node width
      const y = (canvasRect.height / 2 - 100) / scale - position.y; // Arbitrary height
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
    setTemporaryConnection(null);
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const handleResetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Handle mouse wheel for zooming
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale(prev => Math.max(0.5, Math.min(prev + delta, 2)));
      }
    };
    
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);
  
  return (
    <div 
      ref={(node) => {
        const result = drop(node);
        return undefined;
      }}
      className={`node-canvas ${isOver ? 'canvas-drop-active' : ''}`}
      onClick={handleCanvasClick}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
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
          onClick={() => handleAddNode(NodeType.FORMAT)}
          title="Add format node"
        >
          <FaCode /> Format
        </button>
        <button 
          className="toolbar-button"
          onClick={() => handleAddNode(NodeType.FILTER_JOIN)}
          title="Add filter join node"
        >
          <FaObjectGroup /> Filter Join
        </button>
      </div>
      
      <div className="canvas-navigation">
        <button 
          className="nav-button"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <FaSearchPlus />
        </button>
        <button 
          className="nav-button"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <FaSearchMinus />
        </button>
        <button 
          className="nav-button"
          onClick={handleResetView}
          title="Reset view"
        >
          <FaHome />
        </button>
      </div>
      
      <div 
        className="canvas-content" 
        ref={canvasRef}
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: '0 0'
        }}
      >
        {nodes.map(node => (
          <div key={node.id} data-node-id={node.id}>
            <Node 
              node={node}
              updateNode={updateNode}
              deleteNode={deleteNode}
              toggleNodeCollapse={toggleNodeCollapse}
              selected={selectedNodeId === node.id}
              onSelect={handleNodeSelect}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
            />
          </div>
        ))}
        
        {connections.map(connection => (
          <ConnectionLine 
            key={`${connection.sourceId}-${connection.targetId}-${connection.sourceHandle}-${connection.targetHandle}`}
            connection={connection}
            nodes={nodes}
          />
        ))}
        
        {temporaryConnection && (
          <svg className="connection-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <path 
              d={`M ${temporaryConnection.sourceX},${temporaryConnection.sourceY} C ${temporaryConnection.sourceX + 50},${temporaryConnection.sourceY} ${temporaryConnection.targetX - 50},${temporaryConnection.targetY} ${temporaryConnection.targetX},${temporaryConnection.targetY}`} 
              stroke="#6c757d" 
              strokeWidth="2" 
              strokeDasharray="5,5"
              fill="none" 
            />
          </svg>
        )}
      </div>
    </div>
  );
};

export default NodeCanvas;
