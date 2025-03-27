import React, { useState } from 'react';
import { FaCode, FaQuoteRight, FaInfoCircle, FaTag, FaSave } from 'react-icons/fa';
import { NodeType, FormatOptions } from '../../contexts/NodeEditorContext';
import './FilterNode.css';

interface FilterNodeProps {
  id: string;
  content: string;
  formatOptions?: FormatOptions;
  onFormatChange: (id: string, formatOptions: FormatOptions) => void;
}

const FilterNode: React.FC<FilterNodeProps> = ({ id, content, formatOptions, onFormatChange }) => {
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  
  // Initialize format state with current options or defaults
  const [formatState, setFormatState] = useState<{
    type: string;
    language: string;
    calloutType: string;
    xmlTag: string;
  }>({
    type: formatOptions?.type || 'none',
    language: formatOptions?.language || 'javascript',
    calloutType: formatOptions?.calloutType || 'info',
    xmlTag: formatOptions?.xmlTag || 'div'
  });

  const handleFormatTypeChange = (type: string) => {
    // For exclusive options, update the type
    setFormatState({
      ...formatState,
      type
    });
  };

  const handleSubOptionChange = (key: string, value: string) => {
    // Update sub-options without changing the type
    setFormatState({
      ...formatState,
      [key]: value
    });
  };

  const applyFormatting = () => {
    // Create format options based on current state
    const newFormatOptions: FormatOptions = {
      type: formatState.type as any,
      language: formatState.type === 'code' ? formatState.language : undefined,
      calloutType: formatState.type === 'callout' ? formatState.calloutType as any : undefined,
      xmlTag: formatState.type === 'xml' ? formatState.xmlTag : undefined
    };
    
    onFormatChange(id, newFormatOptions);
    setShowFormatOptions(false);
  };

  const getFormatIcon = () => {
    if (!formatOptions) return <FaCode />;
    
    switch (formatOptions.type) {
      case 'code':
        return <FaCode />;
      case 'blockquote':
        return <FaQuoteRight />;
      case 'callout':
        return <FaInfoCircle />;
      case 'xml':
        return <FaTag />;
      default:
        return <FaCode />;
    }
  };

  const getFormatDescription = (): string => {
    if (!formatOptions) return 'No Formatting';
    
    switch (formatOptions.type) {
      case 'code':
        return `Code Block${formatOptions.language ? ` (${formatOptions.language})` : ''}`;
      case 'blockquote':
        return 'Blockquote';
      case 'callout':
        return `Callout (${formatOptions.calloutType || 'info'})`;
      case 'xml':
        return `XML <${formatOptions.xmlTag || 'div'}>`;
      default:
        return 'Format';
    }
  };

  return (
    <div className="filter-node" data-node-id={id}>
      <div className="filter-node-header">
        <span className="filter-node-type">Filter</span>
        <div className="filter-node-format" onClick={() => setShowFormatOptions(!showFormatOptions)}>
          {getFormatIcon()}
          <span className="format-description">{getFormatDescription()}</span>
        </div>
      </div>
      
      <div className="filter-node-content">
        {content}
      </div>
      
      <div className="filter-node-handles">
        <div className="input-handle" data-handle-id="input" />
        <div className="output-handle" data-handle-id="output" />
      </div>
      
      {showFormatOptions && (
        <div className="format-options-menu">
          <div className="format-options-header">
            <h4>Format Options</h4>
            <button onClick={() => setShowFormatOptions(false)}>&times;</button>
          </div>
          
          <div className="format-options-list">
            <div className="format-section">
              <h5>Format Type (Choose One)</h5>
              <div className="format-radio-group">
                <label className="format-radio-option">
                  <input 
                    type="radio" 
                    name="formatType" 
                    value="none" 
                    checked={formatState.type === 'none'}
                    onChange={() => handleFormatTypeChange('none')}
                  />
                  <span>None</span>
                </label>
                
                <label className="format-radio-option">
                  <input 
                    type="radio" 
                    name="formatType" 
                    value="code" 
                    checked={formatState.type === 'code'}
                    onChange={() => handleFormatTypeChange('code')}
                  />
                  <FaCode /> <span>Code Block</span>
                </label>
                
                <label className="format-radio-option">
                  <input 
                    type="radio" 
                    name="formatType" 
                    value="blockquote" 
                    checked={formatState.type === 'blockquote'}
                    onChange={() => handleFormatTypeChange('blockquote')}
                  />
                  <FaQuoteRight /> <span>Blockquote</span>
                </label>
                
                <label className="format-radio-option">
                  <input 
                    type="radio" 
                    name="formatType" 
                    value="callout" 
                    checked={formatState.type === 'callout'}
                    onChange={() => handleFormatTypeChange('callout')}
                  />
                  <FaInfoCircle /> <span>Callout</span>
                </label>
                
                <label className="format-radio-option">
                  <input 
                    type="radio" 
                    name="formatType" 
                    value="xml" 
                    checked={formatState.type === 'xml'}
                    onChange={() => handleFormatTypeChange('xml')}
                  />
                  <FaTag /> <span>XML Tags</span>
                </label>
              </div>
            </div>
            
            {/* Conditional sub-options based on selected format type */}
            {formatState.type === 'code' && (
              <div className="format-sub-options">
                <label>Language:</label>
                <input 
                  type="text"
                  value={formatState.language}
                  onChange={(e) => handleSubOptionChange('language', e.target.value)}
                  placeholder="e.g., javascript, python, etc."
                />
              </div>
            )}
            
            {formatState.type === 'callout' && (
              <div className="format-sub-options">
                <label>Type:</label>
                <select
                  value={formatState.calloutType}
                  onChange={(e) => handleSubOptionChange('calloutType', e.target.value)}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
            )}
            
            {formatState.type === 'xml' && (
              <div className="format-sub-options">
                <label>Tag:</label>
                <input 
                  type="text"
                  value={formatState.xmlTag}
                  onChange={(e) => handleSubOptionChange('xmlTag', e.target.value)}
                  placeholder="e.g., div, span, etc."
                />
              </div>
            )}
            
            <div className="format-actions">
              <button 
                className="apply-format-button"
                onClick={applyFormatting}
              >
                Apply Formatting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterNode;
