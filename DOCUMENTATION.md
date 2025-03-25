# ModuPrompt Documentation

## Project Overview

ModuPrompt is a web-based application that provides two different editing modes for creating and organizing text prompts:

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

### Node Mode
- Visual node canvas with connectable nodes
- Filter nodes for transforming content
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

### Exporting Content
1. Click the "Export" button in the header
2. Choose between Markdown or PDF export
3. Configure export options (theme, include comments, etc.)
4. Click the export button to download the file

## Development Status

### Completed Fixes

#### High Priority Issues
- ✅ **Node Connection Creation**
  - Fixed drag from outputs to inputs for connection creation
  - Implemented visual feedback during connection dragging
  - Ensured connections persist when nodes are moved

- ✅ **Mode Synchronization**
  - Ensured formatting changes in one mode are reflected in the other
  - Fixed XML formatting synchronization between modes

#### Medium Priority Issues
- ✅ **Notebook Mode Issues**
  - Fixed drag and drop error between cells
  - Implemented formatting in exports
  - Fixed PDF export to render markdown properly

- ✅ **Node Mode UI Improvements**
  - Added input and output labels to nodes
  - Improved canvas navigation with better user feedback

### Pending Issues

#### Low Priority Issues
- **Snippet Functionality**
  - Implement saving prompt cells to snippets
  - Improve snippet drag and drop functionality

- **Filter Node Implementation**
  - Make filter nodes non-editable
  - Use same filter options as notebook mode
  - Create separate filter nodes as inputs per prompt node when switching modes

- **Documentation Updates**
  - Update user guide with improved functionality
  - Add examples of proper usage for both modes

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
