# ModuPrompt - Modular Prompt Builder

A web-based application that provides two different editing modes for creating and organizing text prompts:

1. **Jupyter Lab Notebook Style** – A cell-based interface reminiscent of Jupyter notebooks, allowing users to stack cells, annotate with comments, and reorder content.
2. **Node-Based Editing** – A visual flow interface, where nodes (representing prompt segments or filters) connect via inputs and outputs.

## Features

### Core Features
- **Snippet Management**: Create and save Markdown snippets in a structured library with folders and subfolders
- **Drag & Drop Functionality**: Easily insert snippets into the notebook or node canvas
- **Markdown Rendering**: Preview Markdown content with support for various formatting options
- **Formatting Options**: Apply code blocks, blockquotes, callouts, and XML tags to content
- **Export Functionality**: Export content as Markdown or PDF with theming options

### Notebook Mode
- Cell-based interface for stacking content
- Comment cells for annotations (not included in exports)
- Cell reordering via drag and drop
- Cell folding/grouping
- Save cells as reusable snippets

### Node Mode
- Visual node canvas with connectable nodes
- Filter nodes for transforming content with formatting options
- Prompt nodes for editable content
- Filter Join nodes for combining multiple filters
- Node collapsing for managing large content
- Visual flow system for connecting nodes

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/DevGuyRash/moduprompt.git
cd moduprompt
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Switching Between Modes
- Use the mode toggle buttons in the header to switch between Notebook and Node modes
- Content is preserved when switching between modes

### Using Formatting Options
1. Click the "Format" button in the header to show formatting options
2. Select the content you want to format
3. Choose a formatting option (code block, blockquote, callout, or XML tags)
4. Configure any additional options (like code language or callout type)
5. Apply the formatting

### Saving and Using Snippets
1. In Notebook mode, click the "Save as Snippet" button in the cell toolbar
2. Enter a name for the snippet and select a folder
3. Click "Save" to add the snippet to your library
4. Access your snippets from the Snippet Panel
5. Drag and drop snippets into your notebook or node canvas

### Working with Nodes
1. In Node mode, use the toolbar to add Prompt, Filter, or Filter Join nodes
2. Connect nodes by dragging from output handles to input handles
3. Edit content in Prompt nodes
4. Apply formatting options to Filter nodes
5. Use Filter Join nodes to combine multiple filters

### Exporting Content
1. Click the "Export" button in the header
2. Choose between Markdown or PDF export
3. Configure export options (theme, include comments, etc.)
4. Click the export button to download the file

## Building for Production

To create a production build:

```bash
npm run build
```

The build files will be in the `dist` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
