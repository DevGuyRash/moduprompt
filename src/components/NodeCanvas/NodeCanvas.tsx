import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { NodeData, NodeConnection, NodeType, useNodeEditor, FormatOptions } from '../../contexts/NodeEditorContext';
import Node from '../Node/Node';
import FormattingOptions from '../FormattingOptions/FormattingOptions';
import { FaPlus, FaFilter, FaObjectGroup, FaCode, FaSearchMinus, FaSearchPlus, FaHome, FaInfoCircle } from 'react-icons/fa';
import './NodeCanvas.css';

interface ConnectionLineProps {
  connection: NodeConnection;
  nodes: NodeData[];
  onDelete?: (connection: NodeConnection) => void;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ connection, nodes, onDelete }) => {
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
  const canvasRect = document.querySelector('.canvas-content')?.getBoundingClientRect();
  
  if (!canvasRect) return null;
  
  const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
  const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
  const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
  const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
  
  // Create a bezier curve path
  const path = `M ${sourceX},${sourceY} C ${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
  
  return (
    <svg className="connection-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
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
    deleteConnection,
    createFormatNode
  } = useNodeEditor();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, handleId: string } | null>(null);
  const [temporaryConnection, setTemporaryConnection] = useState<{ sourceX: number, sourceY: number, targetX: number, targetY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  const [formatPosition, setFormatPosition] = useState({ x: 0, y: 0 });
  const [potentialTarget, setPotentialTarget] = useState<string | null>(null);
  const [showNavigationHint, setShowNavigationHint] = useState(false);
  const [navigationHint, setNavigationHint] = useState('');
  const navigationHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  
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
  
  // Show navigation hint
  const showHint = (message: string) => {
    setNavigationHint(message);
    setShowNavigationHint(true);
    
    // Clear any existing timeout
    if (navigationHintTimeoutRef.current) {
      clearTimeout(navigationHintTimeoutRef.current);
    }
    
    // Hide hint after 3 seconds
    navigationHintTimeoutRef.current = setTimeout(() => {
      setShowNavigationHint(false);
    }, 3000);
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationHintTimeoutRef.current) {
        clearTimeout(navigationHintTimeoutRef.current);
      }
    };
  }, []);
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on the canvas, not on nodes
    if (e.target === canvasContentRef.current) {
      setSelectedNodeId(null);
      if (showFormatOptions) {
        setShowFormatOptions(false);
      }
    }
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Start dragging with left mouse button on the canvas itself (not on nodes)
    if (e.button === 0 && (e.target === canvasContentRef.current || e.currentTarget === canvasContentRef.current)) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Set cursor to grabbing
      if (canvasContentRef.current) {
        canvasContentRef.current.style.cursor = 'grabbing';
      }
      
      // Show navigation hint
      showHint('Drag to pan canvas');
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas && !isDraggingConnection) {
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
        const canvasRect = canvasContentRef.current?.getBoundingClientRect();
        
        if (canvasRect) {
          const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
          const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
          const targetX = e.clientX - canvasRect.left;
          const targetY = e.clientY - canvasRect.top;
          
          setTemporaryConnection({ sourceX, sourceY, targetX, targetY });
          
          // Check if we're over a potential input handle
          const element = document.elementFromPoint(e.clientX, e.clientY);
          const inputHandle = element?.closest('.input-handle');
          
          // Remove previous potential target highlight
          if (potentialTarget) {
            const prevTarget = document.querySelector(`[data-handle-id="${potentialTarget}"].input-handle`);
            prevTarget?.classList.remove('connection-target');
          }
          
          if (inputHandle) {
            const handleId = inputHandle.getAttribute('data-handle-id');
            const nodeId = inputHandle.closest('[data-node-id]')?.getAttribute('data-node-id');
            
            // Don't highlight if trying to connect to the same node
            if (handleId && nodeId && nodeId !== connectionStart.nodeId) {
              inputHandle.classList.add('connection-target');
              setPotentialTarget(handleId);
            } else {
              setPotentialTarget(null);
            }
          } else {
            setPotentialTarget(null);
          }
        }
      }
    }
  };
  
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    setIsDraggingCanvas(false);
    if (isDraggingConnection) {
      // Check if we're over an input handle
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const inputHandle = element?.closest('.input-handle');
      
      if (inputHandle && connectionStart) {
        const nodeId = inputHandle.closest('[data-node-id]')?.getAttribute('data-node-id');
        const handleId = inputHandle.getAttribute('data-handle-id');
        
        if (nodeId && handleId && connectionStart.nodeId !== nodeId) {
          // Create a new connection
          addConnection({
            sourceId: connectionStart.nodeId,
            targetId: nodeId,
            sourceHandle: connectionStart.handleId,
            targetHandle: handleId
          });
          
          // Show connection created hint
          showHint('Connection created');
        }
      }
      
      // Remove any potential target highlights
      if (potentialTarget) {
        const prevTarget = document.querySelector(`[data-handle-id="${potentialTarget}"].input-handle`);
        prevTarget?.classList.remove('connection-target');
        setPotentialTarget(null);
      }
      
      setIsDraggingConnection(false);
      setConnectionStart(null);
      setTemporaryConnection(null);
    }
    
    // Reset cursor to grab
    if (canvasContentRef.current) {
      canvasContentRef.current.style.cursor = 'grab';
    }
  };
  
  const handleNodeSelect = (id: string) => {
    // Only select the node that was clicked, not all nodes
    setSelectedNodeId(id);
    
    // If the selected node is a format node, show formatting options
    const node = nodes.find(n => n.id === id);
    if (node && node.type === NodeType.FORMAT) {
      setFormatPosition(node.position);
      setShowFormatOptions(true);
    }
    
    // Show node selected hint
    showHint('Node selected');
  };
  
  const handleAddNode = (type: NodeType) => {
    // Add node at the center of the canvas
    const canvasRect = canvasContentRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const x = (canvasRect.width / 2 - 140) / scale - position.x; // Half of node width
      const y = (canvasRect.height / 2 - 100) / scale - position.y; // Arbitrary height
      addNode(type, { x, y });
      
      // Show node added hint
      showHint(`${type} node added`);
    }
  };
  
  const handleConnectionStart = (nodeId: string, handleId: string) => {
    setConnectionStart({ nodeId, handleId });
    setIsDraggingConnection(true);
    
    // Add connection-active class to the source handle
    const sourceHandle = document.querySelector(
      `[data-node-id="${nodeId}"] [data-handle-id="${handleId}"]`
    );
    sourceHandle?.classList.add('connection-active');
    
    // Show connection hint
    showHint('Drag to connect to an input');
  };
  
  const handleConnectionEnd = (nodeId: string, handleId: string) => {
    if (connectionStart) {
      // Create a new connection
      addConnection({
        sourceId: connectionStart.nodeId,
        targetId: nodeId,
        sourceHandle: connectionStart.handleId,
        targetHandle: handleId
      });
      
      // Show connection created hint
      showHint('Connection created');
    }
    
    // Remove connection-active class from the source handle
    if (connectionStart) {
      const sourceHandle = document.querySelector(
        `[data-node-id="${connectionStart.nodeId}"] [data-handle-id="${connectionStart.handleId}"]`
      );
      sourceHandle?.classList.remove('connection-active');
    }
    
    setIsDraggingConnection(false);
    setConnectionStart(null);
    setTemporaryConnection(null);
  };
  
  const handleDisconnect = (nodeId: string, handleId: string, isInput: boolean) => {
    // Find and delete the connection
    const connection = connections.find(conn => 
      isInput 
        ? conn.targetId === nodeId && conn.targetHandle === handleId
        : conn.sourceId === nodeId && conn.sourceHandle === handleId
    );
    
    if (connection) {
      deleteConnection(connection);
      
      // Show disconnection hint
      showHint('Connection removed');
    }
  };
  
  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale * 1.2, 2));
    showHint('Zoomed in');
  };
  
  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.5));
    showHint('Zoomed out');
  };
  
  const handleResetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    showHint('View reset');
  };
  
  const handleFormatChange = (formatOptions: FormatOptions) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, { formatOptions });
    }
  };
  
  // Handle wheel events for zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY;
      
      if (delta > 0) {
        // Zoom out
        setScale(prevScale => Math.max(prevScale / 1.1, 0.5));
        showHint('Zoomed out');
      } else {
        // Zoom in
        setScale(prevScale => Math.min(prevScale * 1.1, 2));
        showHint('Zoomed in');
      }
    }
  };
  
  // Connect the drop ref to our canvas ref
  drop(canvasRef);
  
  return (
    <div 
      ref={canvasRef}
      className="node-canvas"
      onWheel={handleWheel}
    >
      <div className="canvas-toolbar">
        <div className="toolbar-section">
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
            <FaObjectGroup /> Join
          </button>
          <button 
            className="toolbar-button"
            onClick={() => handleAddNode(NodeType.FORMAT)}
            title="Add format node"
          >
            <FaCode /> Format
          </button>
        </div>
        
        <div className="toolbar-section">
          <button 
            className="toolbar-button"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <FaSearchPlus />
          </button>
          <button 
            className="toolbar-button"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <FaSearchMinus />
          </button>
          <button 
            className="toolbar-button"
            onClick={handleResetView}
            title="Reset view"
          >
            <FaHome />
          </button>
          <button 
            className="toolbar-button"
            onClick={() => showHint('Drag canvas to pan, Ctrl+Wheel to zoom, Click nodes to select')}
            title="Show help"
          >
            <FaInfoCircle />
          </button>
        </div>
      </div>
      
      <div 
        ref={canvasContentRef}
        className="canvas-content"
        style={{ 
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          cursor: isDraggingCanvas ? 'grabbing' : 'grab'
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Render all nodes */}
        {nodes.map(node => (
          <Node 
            key={node.id}
            node={node}
            updateNode={updateNode}
            deleteNode={deleteNode}
            toggleNodeCollapse={toggleNodeCollapse}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            selected={selectedNodeId === node.id}
            onSelect={handleNodeSelect}
            onConnectionStart={handleConnectionStart}
            onConnectionEnd={handleConnectionEnd}
            onDisconnect={handleDisconnect}
          />
        ))}
        
        {/* Render all connections */}
        {connections.map(connection => (
          <ConnectionLine 
            key={`${connection.sourceId}-${connection.sourceHandle}-${connection.targetId}-${connection.targetHandle}`}
            connection={connection}
            nodes={nodes}
          />
        ))}
        
        {/* Render temporary connection line when dragging */}
        {temporaryConnection && (
          <svg className="connection-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <path 
              d={`M ${temporaryConnection.sourceX},${temporaryConnection.sourceY} C ${temporaryConnection.sourceX + 50},${temporaryConnection.sourceY} ${temporaryConnection.targetX - 50},${temporaryConnection.targetY} ${temporaryConnection.targetX},${temporaryConnection.targetY}`} 
              stroke="#6c757d" 
              strokeWidth="2" 
              strokeDasharray="5,5"
              fill="none" 
            />
          </svg>
        )}
        
        {/* Render formatting options panel if a format node is selected */}
        {showFormatOptions && selectedNodeId && (
          <div 
            className="format-options-panel"
            style={{ 
              position: 'absolute',
              left: formatPosition.x + 300, // Position to the right of the node
              top: formatPosition.y,
              transform: 'scale(1)',
              transformOrigin: 'top left'
            }}
          >
            <FormattingOptions 
              cellId={selectedNodeId}
              onFormatChange={handleFormatChange}
              initialFormat={nodes.find(n => n.id === selectedNodeId)?.formatOptions}
            />
          </div>
        )}
      </div>
      
      {/* Navigation hint */}
      <div className={`canvas-navigation-hint ${showNavigationHint ? 'visible' : ''}`}>
        {navigationHint}
      </div>
    </div>
  );
};

export default NodeCanvas;
