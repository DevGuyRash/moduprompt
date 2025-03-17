import React from 'react';
import { FaCode, FaQuoteRight, FaInfoCircle, FaTag, FaPlus } from 'react-icons/fa';
import { FormatOptions, NodeType, useNodeEditor } from '../../contexts/NodeEditorContext';
import './FormattingOptions.css';

/**
 * Props for the FormattingOptions component
 * @property {string|null} cellId - ID of the cell to format in notebook mode
 * @property {Object} position - Position for node mode formatting
 * @property {string} currentMode - Current editing mode ('notebook' or 'node')
 * @property {Function} onClose - Function to call when closing the formatting panel
 */
interface FormattingOptionsProps {
  cellId?: string | null; // For notebook mode - updated to accept null
  position?: { x: number, y: number }; // For node mode
  currentMode: 'notebook' | 'node';
  onClose?: () => void;
}

/**
 * Component for selecting and applying formatting options to cells or nodes
 * Provides options for code blocks, blockquotes, callouts, and XML tags
 */
const FormattingOptions: React.FC<FormattingOptionsProps> = ({ 
  cellId, 
  position, 
  currentMode,
  onClose 
}) => {
  const { addNode } = useNodeEditor();
  const [formatType, setFormatType] = React.useState<'code' | 'blockquote' | 'callout' | 'xml'>('code');
  const [codeLanguage, setCodeLanguage] = React.useState('');
  const [calloutType, setCalloutType] = React.useState('info');
  const [xmlTag, setXmlTag] = React.useState('');

  /**
   * Creates a format node in node mode
   */
  const createFormatNode = () => {
    if (currentMode === 'node' && position) {
      const formatOptions: FormatOptions = {
        type: formatType,
        language: formatType === 'code' ? codeLanguage : undefined,
        calloutType: formatType === 'callout' ? calloutType as 'info' | 'warning' | 'success' | 'error' : undefined,
        xmlTag: formatType === 'xml' ? xmlTag : undefined
      };

      // Create a format node at the specified position
      addNode(
        NodeType.FORMAT, 
        position, 
        getFormatDescription(formatOptions),
        formatOptions
      );

      if (onClose) onClose();
    }
  };

  /**
   * Gets a human-readable description of the formatting options
   * @param {FormatOptions} options - The formatting options
   * @returns {string} A description of the formatting
   */
  const getFormatDescription = (options: FormatOptions): string => {
    switch (options.type) {
      case 'code':
        return `Code Block${options.language ? ` (${options.language})` : ''}`;
      case 'blockquote':
        return 'Blockquote';
      case 'callout':
        return `Callout (${options.calloutType})`;
      case 'xml':
        return `XML <${options.xmlTag}>`;
      default:
        return 'Format';
    }
  };

  return (
    <div className="formatting-options">
      <h3>Formatting Options</h3>
      
      <div className="format-type-selector">
        <div 
          className={`format-type-option ${formatType === 'code' ? 'selected' : ''}`}
          onClick={() => setFormatType('code')}
        >
          <FaCode /> Code
        </div>
        <div 
          className={`format-type-option ${formatType === 'blockquote' ? 'selected' : ''}`}
          onClick={() => setFormatType('blockquote')}
        >
          <FaQuoteRight /> Quote
        </div>
        <div 
          className={`format-type-option ${formatType === 'callout' ? 'selected' : ''}`}
          onClick={() => setFormatType('callout')}
        >
          <FaInfoCircle /> Callout
        </div>
        <div 
          className={`format-type-option ${formatType === 'xml' ? 'selected' : ''}`}
          onClick={() => setFormatType('xml')}
        >
          <FaTag /> XML
        </div>
      </div>
      
      <div className="format-options-container">
        {formatType === 'code' && (
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
        
        {formatType === 'callout' && (
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
        )}
        
        {formatType === 'xml' && (
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
          disabled={formatType === 'xml' && !xmlTag}
        >
          <FaPlus /> Create Format Node
        </button>
      )}
    </div>
  );
};

export default FormattingOptions;
