import React from 'react';
import { SnippetType } from '../types/snippet';

export enum NodeType {
  PROMPT = 'prompt',
  FILTER = 'filter',
  FILTER_JOIN = 'filter_join',
  FORMAT = 'format'
}

export interface NodeConnection {
  sourceId: string;
  targetId: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface FormatOptions {
  type: 'code' | 'blockquote' | 'callout' | 'xml';
  language?: string;
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  xmlTag?: string;
}

export interface NodeData {
  id: string;
  type: NodeType;
  content: string;
  position: { x: number, y: number };
  isCollapsed: boolean;
  inputs: string[];
  outputs: string[];
  formatOptions?: FormatOptions;
}

interface NodeEditorContextType {
  nodes: NodeData[];
  connections: NodeConnection[];
  addNode: (type: NodeType, position: { x: number, y: number }, content?: string, formatOptions?: FormatOptions) => string;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, position: { x: number, y: number }) => void;
  toggleNodeCollapse: (id: string) => void;
  addConnection: (connection: NodeConnection) => void;
  deleteConnection: (sourceId: string, targetId: string) => void;
  insertSnippet: (snippet: SnippetType, position: { x: number, y: number }) => void;
}

const defaultContext: NodeEditorContextType = {
  nodes: [],
  connections: [],
  addNode: () => '',
  updateNode: () => {},
  deleteNode: () => {},
  moveNode: () => {},
  toggleNodeCollapse: () => {},
  addConnection: () => {},
  deleteConnection: () => {},
  insertSnippet: () => {}
};

export const NodeEditorContext = React.createContext<NodeEditorContextType>(defaultContext);

export const NodeEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = React.useState<NodeData[]>([]);
  const [connections, setConnections] = React.useState<NodeConnection[]>([]);

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const addNode = (type: NodeType, position: { x: number, y: number }, content: string = '', formatOptions?: FormatOptions) => {
    const newNode: NodeData = {
      id: generateId(),
      type,
      content,
      position,
      isCollapsed: false,
      inputs: type === NodeType.FORMAT ? [] : type === NodeType.PROMPT ? ['input', 'format'] : ['input1', 'input2'],
      outputs: ['output'],
      formatOptions
    };

    setNodes(prev => [...prev, newNode]);
    return newNode.id;
  };

  const updateNode = (id: string, data: Partial<NodeData>) => {
    setNodes(prev => 
      prev.map(node => 
        node.id === id ? { ...node, ...data } : node
      )
    );
  };

  const deleteNode = (id: string) => {
    // Remove the node
    setNodes(prev => prev.filter(node => node.id !== id));
    
    // Remove any connections to/from this node
    setConnections(prev => 
      prev.filter(conn => conn.sourceId !== id && conn.targetId !== id)
    );
  };

  const moveNode = (id: string, position: { x: number, y: number }) => {
    updateNode(id, { position });
  };

  const toggleNodeCollapse = (id: string) => {
    setNodes(prev => 
      prev.map(node => 
        node.id === id ? { ...node, isCollapsed: !node.isCollapsed } : node
      )
    );
  };

  const addConnection = (connection: NodeConnection) => {
    // Check if connection already exists
    const exists = connections.some(
      conn => 
        conn.sourceId === connection.sourceId && 
        conn.targetId === connection.targetId &&
        conn.sourceHandle === connection.sourceHandle &&
        conn.targetHandle === connection.targetHandle
    );

    // Check if we're connecting to the right input type
    const sourceNode = nodes.find(node => node.id === connection.sourceId);
    const targetNode = nodes.find(node => node.id === connection.targetId);
    
    if (sourceNode && targetNode) {
      // Format nodes can only connect to format inputs
      if (sourceNode.type === NodeType.FORMAT && connection.targetHandle !== 'format') {
        return; // Don't allow connection
      }
      
      // Only allow one connection to each input
      const inputAlreadyConnected = connections.some(
        conn => conn.targetId === connection.targetId && conn.targetHandle === connection.targetHandle
      );
      
      if (!exists && !inputAlreadyConnected) {
        setConnections(prev => [...prev, connection]);
      }
    }
  };

  const deleteConnection = (sourceId: string, targetId: string) => {
    setConnections(prev => 
      prev.filter(conn => 
        !(conn.sourceId === sourceId && conn.targetId === targetId)
      )
    );
  };

  const insertSnippet = (snippet: SnippetType, position: { x: number, y: number }) => {
    // Create a prompt node with the snippet content
    addNode(NodeType.PROMPT, position, snippet.content);
  };

  return (
    <NodeEditorContext.Provider 
      value={{ 
        nodes, 
        connections,
        addNode, 
        updateNode, 
        deleteNode, 
        moveNode,
        toggleNodeCollapse,
        addConnection,
        deleteConnection,
        insertSnippet
      }}
    >
      {children}
    </NodeEditorContext.Provider>
  );
};

export const useNodeEditor = () => React.useContext(NodeEditorContext);
