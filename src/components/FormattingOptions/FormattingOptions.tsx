import React from 'react';
import { FaCode, FaQuoteRight, FaInfoCircle, FaTag, FaPlus, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { FormatOptions, NodeType, useNodeEditor } from '../../contexts/NodeEditorContext';
import './FormattingOptions.css';

/**
 * Props for the FormattingOptions component
 * @property {string|null} cellId - ID of the cell to format in notebook mode
 * @property {Object} position - Position for node mode formatting
 * @property {string} currentMode - Current editing mode ('notebook' or 'node')
 * @property {Function} onClose - Function to call when closing the formatting panel
 * @property {boolean} isDocumentLevel - Whether these options apply to the entire document
 */
interface FormattingOptionsProps {
  cellId?: string | null; // For notebook mode - updated to accept null
  position?: { x: number, y: number }; // For node mode
  currentMode: 'notebook' | 'node';
  onClose?: () => void;
  isDocumentLevel?: boolean;
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
  isDocumentLevel = false
}) => {
  const { addNode } = useNodeEditor();
  const [activeFormatters, setActiveFormatters] = React.useState<{
    code: boolean;
    blockquote: boolean;
    callout: boolean;
    xml: boolean;
  }>({
    code: false,
    blockquote: false,
    callout: false,
    xml: false
  });
  const [codeLanguage, setCodeLanguage] = React.useState('');
  const [calloutType, setCalloutType] = React.useState('info');
  const [xmlTag, setXmlTag] = React.useState('div');
  const [calloutName, setCalloutName] = React.useState('');

  /**
   * Toggles a formatter on or off
   * @param {string} formatter - The formatter to toggle
   */
  const toggleFormatter = (formatter: 'code' | 'blockquote' | 'callout' | 'xml') => {
    // If toggling on XML or code, turn off the other (they're mutually exclusive wrappers)
    if ((formatter === 'xml' || formatter === 'code') && !activeFormatters[formatter]) {
      setActiveFormatters(prev => ({
        ...prev,
        code: formatter === 'code' ? true : false,
        xml: formatter === 'xml' ? true : false,
        [formatter]: !prev[formatter]
      }));
    } else {
      setActiveFormatters(prev => ({
        ...prev,
        [formatter]: !prev[formatter]
      }));
    }
  };

  /**
   * Creates a format node in node mode
   */
  const createFormatNode = () => {
    if (currentMode === 'node' && position) {
      // Determine which formatters are active
      let formatOptions: FormatOptions = {};
      
      if (activeFormatters.code) {
        formatOptions.type = 'code';
        formatOptions.language = codeLanguage;
      } else if (activeFormatters.xml) {
        formatOptions.type = 'xml';
        formatOptions.xmlTag = xmlTag;
      } else if (activeFormatters.blockquote) {
        formatOptions.type = 'blockquote';
      } else if (activeFormatters.callout) {
        formatOptions.type = 'callout';
        formatOptions.calloutType = calloutType as 'info' | 'warning' | 'success' | 'error';
      }

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

  return (
    <div className={`formatting-options ${isDocumentLevel ? 'document-level' : ''}`}>
      <h3>{isDocumentLevel ? 'Document Formatting' : 'Cell Formatting'}</h3>
      
      <div className="format-toggles">
        <div 
          className={`format-toggle ${activeFormatters.code ? 'active' : ''}`}
          onClick={() => toggleFormatter('code')}
        >
          <div className="toggle-icon">
            {activeFormatters.code ? <FaToggleOn /> : <FaToggleOff />}
          </div>
          <div className="toggle-label">
            <FaCode /> Code Block
          </div>
        </div>
        
        <div 
          className={`format-toggle ${activeFormatters.blockquote ? 'active' : ''}`}
          onClick={() => toggleFormatter('blockquote')}
        >
          <div className="toggle-icon">
            {activeFormatters.blockquote ? <FaToggleOn /> : <FaToggleOff />}
          </div>
          <div className="toggle-label">
            <FaQuoteRight /> Blockquote
          </div>
        </div>
        
        <div 
          className={`format-toggle ${activeFormatters.callout ? 'active' : ''}`}
          onClick={() => toggleFormatter('callout')}
        >
          <div className="toggle-icon">
            {activeFormatters.callout ? <FaToggleOn /> : <FaToggleOff />}
          </div>
          <div className="toggle-label">
            <FaInfoCircle /> Callout
          </div>
        </div>
        
        <div 
          className={`format-toggle ${activeFormatters.xml ? 'active' : ''}`}
          onClick={() => toggleFormatter('xml')}
        >
          <div className="toggle-icon">
            {activeFormatters.xml ? <FaToggleOn /> : <FaToggleOff />}
          </div>
          <div className="toggle-label">
            <FaTag /> XML Tags
          </div>
        </div>
      </div>
      
      <div className="format-options-container">
        {activeFormatters.code && (
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
        
        {activeFormatters.callout && (
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
        
        {activeFormatters.xml && (
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
          disabled={(activeFormatters.xml && !xmlTag) || 
                   (!activeFormatters.code && !activeFormatters.blockquote && 
                    !activeFormatters.callout && !activeFormatters.xml)}
        >
          <FaPlus /> Create Format Node
        </button>
      )}
    </div>
  );
};

export default FormattingOptions;
