import React from 'react';
import { FaCode, FaQuoteRight, FaInfoCircle, FaTag } from 'react-icons/fa';
import './FormattingOptions.css';

interface FormattingOptionsProps {
  onApplyFormatting: (formatterType: string, options?: any) => void;
}

const FormattingOptions: React.FC<FormattingOptionsProps> = ({ onApplyFormatting }) => {
  const [codeLanguage, setCodeLanguage] = React.useState('');
  const [calloutType, setCalloutType] = React.useState('info');
  const [xmlTag, setXmlTag] = React.useState('');

  return (
    <div className="formatting-options">
      <h3>Formatting Options</h3>
      
      <div className="formatter-group">
        <button 
          className="formatter-button"
          onClick={() => onApplyFormatting('code', { language: codeLanguage })}
          title="Wrap in code block"
        >
          <FaCode /> Code Block
        </button>
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
      
      <div className="formatter-group">
        <button 
          className="formatter-button"
          onClick={() => onApplyFormatting('blockquote')}
          title="Convert to blockquote"
        >
          <FaQuoteRight /> Blockquote
        </button>
      </div>
      
      <div className="formatter-group">
        <button 
          className="formatter-button"
          onClick={() => onApplyFormatting('callout', { type: calloutType })}
          title="Convert to callout"
        >
          <FaInfoCircle /> Callout
        </button>
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
        <button 
          className="formatter-button"
          onClick={() => onApplyFormatting('xml', { tag: xmlTag })}
          title="Wrap in XML tags"
        >
          <FaTag /> XML Tags
        </button>
        <input 
          type="text"
          value={xmlTag}
          onChange={(e) => setXmlTag(e.target.value)}
          placeholder="Tag name"
          className="formatter-option"
        />
      </div>
    </div>
  );
};

export default FormattingOptions;
