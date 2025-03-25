import React, { useState } from 'react';
import { FaCode, FaQuoteRight, FaInfoCircle, FaTag } from 'react-icons/fa';
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

  const handleFormatChange = (type: 'code' | 'blockquote' | 'callout' | 'xml', additionalOptions?: any) => {
    const newFormatOptions: FormatOptions = {
      type,
      ...additionalOptions
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
            <button 
              className={`format-option ${formatOptions?.type === 'code' ? 'active' : ''}`}
              onClick={() => handleFormatChange('code', { language: formatOptions?.language || '' })}
            >
              <FaCode /> Code Block
            </button>
            
            {formatOptions?.type === 'code' && (
              <div className="format-sub-options">
                <label>Language:</label>
                <input 
                  type="text"
                  value={formatOptions.language || ''}
                  onChange={(e) => handleFormatChange('code', { language: e.target.value })}
                  placeholder="e.g., javascript, python, etc."
                />
              </div>
            )}
            
            <button 
              className={`format-option ${formatOptions?.type === 'blockquote' ? 'active' : ''}`}
              onClick={() => handleFormatChange('blockquote')}
            >
              <FaQuoteRight /> Blockquote
            </button>
            
            <button 
              className={`format-option ${formatOptions?.type === 'callout' ? 'active' : ''}`}
              onClick={() => handleFormatChange('callout', { calloutType: formatOptions?.calloutType || 'info' })}
            >
              <FaInfoCircle /> Callout
            </button>
            
            {formatOptions?.type === 'callout' && (
              <div className="format-sub-options">
                <label>Type:</label>
                <select
                  value={formatOptions.calloutType || 'info'}
                  onChange={(e) => handleFormatChange('callout', { calloutType: e.target.value as 'info' | 'warning' | 'success' | 'error' })}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
            )}
            
            <button 
              className={`format-option ${formatOptions?.type === 'xml' ? 'active' : ''}`}
              onClick={() => handleFormatChange('xml', { xmlTag: formatOptions?.xmlTag || 'div' })}
            >
              <FaTag /> XML Tags
            </button>
            
            {formatOptions?.type === 'xml' && (
              <div className="format-sub-options">
                <label>Tag:</label>
                <input 
                  type="text"
                  value={formatOptions.xmlTag || 'div'}
                  onChange={(e) => handleFormatChange('xml', { xmlTag: e.target.value })}
                  placeholder="e.g., div, span, etc."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterNode;
