import React from 'react';
import { SnippetType } from '../types/snippet';
import { CellType, CellData, FormatOptions as NotebookFormatOptions } from './NotebookContext';
import { FormatOptions as NodeFormatOptions } from './NodeEditorContext';

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
  createFormatNode: (formatOptions: FormatOptions, position: { x: number, y: number }) => string;
  clearNodes: () => void;
  convertCellsToNodes: (cells: CellData[]) => void;
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
  insertSnippet: () => {},
  createFormatNode: () => '',
  clearNodes: () => {},
  convertCellsToNodes: () => {}
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
      inputs: getNodeInputs(type),
      outputs: ['output'],
      formatOptions
    };

    setNodes(prev => [...prev, newNode]);
    return newNode.id;
  };

  const getNodeInputs = (type: NodeType): string[] => {
    switch (type) {
      case NodeType.PROMPT:
        return ['input', 'format'];
      case NodeType.FILTER:
        return ['input'];
      case NodeType.FORMAT:
        return ['input'];
      case NodeType.FILTER_JOIN:
        return ['input1', 'input2'];
      default:
        return ['input'];
    }
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

  const createFormatNode = (formatOptions: FormatOptions, position: { x: number, y: number }) => {
    // Create a format node with the specified formatting options
    const formatDescription = getFormatDescription(formatOptions);
    return addNode(NodeType.FORMAT, position, formatDescription, formatOptions);
  };

  const getFormatDescription = (options: FormatOptions): string => {
    if (!options.type) return 'No Formatting';
    
    switch (options.type) {
      case 'code':
        return `Code Block${options.language ? ` (${options.language})` : ''}`;
      case 'blockquote':
        return 'Blockquote';
      case 'callout':
        return `Callout (${options.calloutType || 'info'})`;
      case 'xml':
        return `XML <${options.xmlTag || 'div'}>`;
      default:
        return 'Format';
    }
  };

  const clearNodes = () => {
    setNodes([]);
    setConnections([]);
  };

  // Convert notebook format options to node format options
  const convertFormatOptions = (notebookFormatting?: NotebookFormatOptions): FormatOptions | undefined => {
    if (!notebookFormatting || !notebookFormatting.type) return undefined;
    
    return {
      type: notebookFormatting.type,
      language: notebookFormatting.language,
      calloutType: notebookFormatting.calloutType,
      xmlTag: notebookFormatting.xmlTag
    };
  };

  const convertCellsToNodes = (cells: CellData[]) => {
    // Clear existing nodes and connections
    clearNodes();
    
    // Create nodes for each content cell
    const newNodes: NodeData[] = [];
    const newConnections: NodeConnection[] = [];
    
    // Position nodes in a vertical layout
    let yPosition = 100;
    let previousNodeId: string | null = null;
    
    cells.forEach((cell, index) => {
      if (cell.type === CellType.CONTENT) {
        // Create a prompt node for the content
        const promptNodeId = generateId();
        const promptNode: NodeData = {
          id: promptNodeId,
          type: NodeType.PROMPT,
          content: cell.content,
          position: { x: 300, y: yPosition },
          isCollapsed: false,
          inputs: getNodeInputs(NodeType.PROMPT),
          outputs: ['output']
        };
        
        newNodes.push(promptNode);
        
        // If there's formatting, create a format node
        if (cell.formatting) {
          // Convert NotebookContext.FormatOptions to NodeEditorContext.FormatOptions
          const formatOptions = convertFormatOptions(cell.formatting);
          
          if (formatOptions) {
            const formatNodeId = generateId();
            const formatNode: NodeData = {
              id: formatNodeId,
              type: NodeType.FORMAT,
              content: getFormatDescription(formatOptions),
              position: { x: 100, y: yPosition },
              isCollapsed: false,
              inputs: getNodeInputs(NodeType.FORMAT),
              outputs: ['output'],
              formatOptions
            };
            
            newNodes.push(formatNode);
            
            // Connect format node to prompt node
            newConnections.push({
              sourceId: formatNodeId,
              targetId: promptNodeId,
              sourceHandle: 'output',
              targetHandle: 'format'
            });
          }
        }
        
        // Connect to previous node if it exists
        if (previousNodeId) {
          newConnections.push({
            sourceId: previousNodeId,
            targetId: promptNodeId,
            sourceHandle: 'output',
            targetHandle: 'input'
          });
        }
        
        previousNodeId = promptNodeId;
        yPosition += 250; // Increment Y position for next node
      }
    });
    
    // Update state with new nodes and connections
    setNodes(newNodes);
    setConnections(newConnections);
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
        insertSnippet,
        createFormatNode,
        clearNodes,
        convertCellsToNodes
      }}
    >
      {children}
    </NodeEditorContext.Provider>
  );
};

export const useNodeEditor = () => React.useContext(NodeEditorContext);
