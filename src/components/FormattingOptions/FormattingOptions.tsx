import React, { useEffect, useState } from 'react';
import { FaCode, FaQuoteRight, FaInfoCircle, FaTag, FaPlus, FaToggleOn, FaToggleOff, FaGripVertical } from 'react-icons/fa';
import { FormatOptions, NodeType, useNodeEditor } from '../../contexts/NodeEditorContext';
import { useNotebook } from '../../contexts/NotebookContext';
import './FormattingOptions.css';

/**
 * Props for the FormattingOptions component
 * @property {string|null} cellId - ID of the cell to format in notebook mode
 * @property {Object} position - Position for node mode formatting
 * @property {string} currentMode - Current editing mode ('notebook' or 'node')
 * @property {Function} onClose - Function to call when closing the formatting panel
 * @property {boolean} isDocumentLevel - Whether these options apply to the entire document
 * @property {Function} onCreateFormat - Function to call when creating a format in node mode
 */
interface FormattingOptionsProps {
  cellId?: string | null; // For notebook mode - updated to accept null
  position?: { x: number, y: number }; // For node mode
  currentMode: 'notebook' | 'node';
  onClose?: () => void;
  isDocumentLevel?: boolean;
  onCreateFormat?: (formatOptions: FormatOptions) => void;
}

// Define format types and their properties
interface FormatType {
  id: string;
  name: string;
  icon: React.ReactNode;
  exclusive: boolean; // Whether this format is exclusive with others in its group
  group: 'wrapper' | 'container'; // Formats in the same group are mutually exclusive if exclusive=true
}

/**
 * Component for selecting and applying formatting options to cells or nodes
 * Provides options for code blocks, blockquotes, callouts, and XML tags
 */
const FormattingOptions: React.FC<FormattingOptionsProps> = ({ 
  cellId, 
  position, 
  currentMode,
  onClose,
  isDocumentLevel = false,
  onCreateFormat
}) => {
  const { addNode } = useNodeEditor();
  const { cells, formatCell, removeFormatting } = useNotebook();
  
  // Define available format types
  const formatTypes: FormatType[] = [
    { id: 'code', name: 'Code Block', icon: <FaCode />, exclusive: true, group: 'wrapper' },
    { id: 'xml', name: 'XML Tags', icon: <FaTag />, exclusive: true, group: 'wrapper' },
    { id: 'blockquote', name: 'Blockquote', icon: <FaQuoteRight />, exclusive: true, group: 'container' },
    { id: 'callout', name: 'Callout', icon: <FaInfoCircle />, exclusive: true, group: 'container' },
  ];
  
  // Track active formatters in order of application
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  
  // Format-specific options
  const [codeLanguage, setCodeLanguage] = useState('');
  const [calloutType, setCalloutType] = useState('info');
  const [xmlTag, setXmlTag] = useState('div');
  const [calloutName, setCalloutName] = useState('');

  // Load existing formatting when component mounts or cellId changes
  useEffect(() => {
    if (currentMode === 'notebook' && cellId) {
      const cell = cells.find(c => c.id === cellId);
      if (cell && cell.formatting) {
        // Reset active formats
        setActiveFormats([]);

        // Set the active formatter based on the cell's formatting
        if (cell.formatting.type) {
          setActiveFormats([cell.formatting.type]);

          // Set additional options based on the formatter type
          switch (cell.formatting.type) {
            case 'code':
              setCodeLanguage(cell.formatting.language || '');
              break;
            case 'callout':
              setCalloutType(cell.formatting.calloutType || 'info');
              break;
            case 'xml':
              setXmlTag(cell.formatting.xmlTag || 'div');
              break;
          }
        }
      }
    }
  }, [cellId, cells, currentMode]);

  /**
   * Toggles a formatter on or off
   * @param {string} formatId - The formatter to toggle
   */
  const toggleFormatter = (formatId: string) => {
    const formatType = formatTypes.find(f => f.id === formatId);
    if (!formatType) return;
    
    // Check if format is already active
    const isActive = activeFormats.includes(formatId);
    
    if (isActive) {
      // Remove the format
      setActiveFormats(prev => prev.filter(f => f !== formatId));
    } else {
      // Add the format, respecting exclusivity rules
      setActiveFormats(prev => {
        const newFormats = [...prev];
        
        // If exclusive, remove other formats in the same group
        if (formatType.exclusive) {
          const formatGroup = formatType.group;
          const conflictingFormats = formatTypes
            .filter(f => f.group === formatGroup && f.id !== formatId)
            .map(f => f.id);
          
          return [...newFormats.filter(f => !conflictingFormats.includes(f)), formatId];
        }
        
        return [...newFormats, formatId];
      });
    }
    
    // Apply formatting to the cell in notebook mode
    if (currentMode === 'notebook' && cellId) {
      // If turning off the formatter and it was the only one, remove formatting
      if (isActive && activeFormats.length === 1) {
        removeFormatting(cellId);
      } else {
        // Apply the new formatting
        applyFormatting();
      }
    }
  };

  /**
   * Applies the current formatting options to the selected cell
   */
  const applyFormatting = () => {
    if (currentMode === 'notebook' && cellId && activeFormats.length > 0) {
      // Use the first active format as the primary format type
      // In future, could implement nested formatting
      const primaryFormat = activeFormats[0];
      let formatOptions: FormatOptions = { type: primaryFormat as any };
      
      // Add format-specific options
      switch (primaryFormat) {
        case 'code':
          formatOptions.language = codeLanguage;
          break;
        case 'xml':
          formatOptions.xmlTag = xmlTag;
          break;
        case 'callout':
          formatOptions.calloutType = calloutType as 'info' | 'warning' | 'success' | 'error';
          break;
      }

      // Apply formatting to the cell
      formatCell(cellId, formatOptions);
    }
  };

  /**
   * Creates a format node in node mode
   */
  const createFormatNode = () => {
    if (currentMode === 'node' && position && activeFormats.length > 0) {
      // Use the first active format as the primary format type
      const primaryFormat = activeFormats[0];
      let formatOptions: FormatOptions = { type: primaryFormat as any };
      
      // Add format-specific options
      switch (primaryFormat) {
        case 'code':
          formatOptions.language = codeLanguage;
          break;
        case 'xml':
          formatOptions.xmlTag = xmlTag;
          break;
        case 'callout':
          formatOptions.calloutType = calloutType as 'info' | 'warning' | 'success' | 'error';
          break;
      }

      if (onCreateFormat) {
        // Use the provided callback if available
        onCreateFormat(formatOptions);
      } else {
        // Create a format node at the specified position
        addNode(
          NodeType.FORMAT, 
          position, 
          getFormatDescription(formatOptions),
          formatOptions
        );
      }

      if (onClose) onClose();
    }
  };

  /**
   * Gets a human-readable description of the formatting options
   * @param {FormatOptions} options - The formatting options
   * @returns {string} A description of the formatting
   */
  const getFormatDescription = (options: FormatOptions): string => {
    if (!options.type) return 'No Formatting';
    
    switch (options.type) {
      case 'code':
        return `Code Block${options.language ? ` (${options.language})` : ''}`;
      case 'blockquote':
        return 'Blockquote';
      case 'callout':
        return `Callout (${options.calloutType})${calloutName ? `: ${calloutName}` : ''}`;
      case 'xml':
        return `XML <${options.xmlTag || 'div'}>`;
      default:
        return 'Format';
    }
  };

  // Handle changes to formatting options
  useEffect(() => {
    if (currentMode === 'notebook' && cellId && activeFormats.length > 0) {
      // Apply formatting when options change
      applyFormatting();
    }
  }, [codeLanguage, calloutType, xmlTag, calloutName]);

  return (
    <div className={`formatting-options ${isDocumentLevel ? 'document-level' : ''}`}>
      <h3>{isDocumentLevel ? 'Document Formatting' : 'Cell Formatting'}</h3>
      
      <div className="format-section">
        <h4>Select Format Types</h4>
        <div className="format-toggles">
          {formatTypes.map(format => (
            <div 
              key={format.id}
              className={`format-toggle ${activeFormats.includes(format.id) ? 'active' : ''}`}
              onClick={() => toggleFormatter(format.id)}
            >
              <div className="toggle-icon">
                {activeFormats.includes(format.id) ? <FaToggleOn /> : <FaToggleOff />}
              </div>
              <div className="toggle-label">
                {format.icon} {format.name}
              </div>
              <div className="format-group-indicator">
                {format.exclusive ? `(${format.group})` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="format-options-container">
        {activeFormats.includes('code') && (
          <div className="formatter-group">
            <label>Language:</label>
            <select 
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="formatter-option"
            >
              <option value="">Plain</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        )}
        
        {activeFormats.includes('callout') && (
          <>
            <div className="formatter-group">
              <label>Callout Type:</label>
              <select 
                value={calloutType}
                onChange={(e) => setCalloutType(e.target.value)}
                className="formatter-option"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="formatter-group">
              <label>Callout Name:</label>
              <input 
                type="text"
                value={calloutName}
                onChange={(e) => setCalloutName(e.target.value)}
                placeholder="Optional title"
                className="formatter-option"
              />
            </div>
          </>
        )}
        
        {activeFormats.includes('xml') && (
          <div className="formatter-group">
            <label>Tag Name:</label>
            <input 
              type="text"
              value={xmlTag}
              onChange={(e) => setXmlTag(e.target.value)}
              placeholder="Enter tag name"
              className="formatter-option"
            />
          </div>
        )}
      </div>
      
      {currentMode === 'node' && (
        <button 
          className="create-format-button"
          onClick={createFormatNode}
          disabled={activeFormats.length === 0 || 
                   (activeFormats.includes('xml') && !xmlTag)}
        >
          <FaPlus /> Create Format Node
        </button>
      )}
    </div>
  );
};

export default FormattingOptions;
