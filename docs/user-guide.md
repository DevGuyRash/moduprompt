# ModuPrompt User Guide

## Introduction

ModuPrompt is a powerful web-based application for creating and organizing text prompts with two different editing modes:

1. **Notebook Mode** - A cell-based interface similar to Jupyter notebooks
2. **Node-Based Editing** - A visual flow interface with connected nodes

This guide will help you understand how to use ModuPrompt effectively to create, organize, and export your prompts.

## Getting Started

When you first open ModuPrompt, you'll see the main interface with a header containing mode toggles and action buttons, a snippet panel on the left, and the main editor area in the center.

### Switching Between Modes

You can switch between Notebook Mode and Node Mode using the toggle buttons in the header:

- **Notebook Mode**: Cell-based interface for linear content organization
- **Node Mode**: Visual flow interface for creating connected nodes

Your content will be preserved when switching between modes.

## Snippet Management

The snippet panel on the left side of the application allows you to organize and manage your snippets.

### Creating Snippets

1. Click the "+" button next to "File" in the snippet panel
2. Enter a name for your snippet
3. Click "Create"

### Organizing Snippets in Folders

1. Click the "+" button next to "Folder" in the snippet panel
2. Enter a name for your folder
3. Click "Create"

You can create nested folders by clicking the "+" button within an existing folder.

### Using Snippets

To use a snippet in your prompt:
1. Click on the snippet in the panel
2. Drag it to the desired location in your notebook or node canvas

## Notebook Mode

### Working with Cells

In Notebook Mode, your content is organized in cells that can be individually edited, moved, and formatted.

#### Adding Cells

- Click the "+" button at the bottom of the notebook to add a new content cell
- Use the "Content" or "Comment" buttons in the toolbar to add specific cell types

#### Editing Cells

- Click the edit/view toggle button (pencil/eye icon) to switch between editing and viewing a cell
- In edit mode, you can type or paste your content
- In view mode, your content is rendered as Markdown

#### Moving Cells

- Use the up/down arrow buttons to move cells
- Drag and drop cells using the handle on the left side

#### Formatting Cells

1. Click the format button (code icon) on a cell
2. Select a formatting option:
   - **Code Block**: Wraps content in a code block with optional language specification
   - **Blockquote**: Converts content to a blockquote
   - **Callout**: Creates a callout box with different types (info, warning, success, error)
   - **XML Tags**: Wraps content in custom XML tags

#### Grouping Cells

1. Click the "Group Cells" button in the toolbar
2. Select multiple consecutive cells
3. Click "Create Group" to collapse them into a single group

## Node-Based Editing

### Working with Nodes

In Node Mode, your content is organized as nodes that can be connected to create a flow.

#### Adding Nodes

- Click and drag from the snippet panel to create a content node
- Use the Format button to create formatting nodes

#### Connecting Nodes

- Click and drag from a node's output connector to another node's input connector

#### Collapsing Nodes

- Click the collapse button on a node to hide its content and show only the title

## Formatting Options

ModuPrompt provides several formatting options for your content:

### Code Blocks

Wraps your content in a code block with syntax highlighting. You can specify the programming language.

### Blockquotes

Converts your content to a blockquote, adding the ">" character at the beginning of each line.

### Callouts

Creates a callout box around your content. You can choose from different types:
- Info (blue)
- Warning (yellow)
- Success (green)
- Error (red)

### XML Tags

Wraps your content in custom XML tags that you specify.

## Exporting Your Work

### Markdown Export

1. Click the "Export" button in the header
2. Select "Export to Markdown"
3. Choose whether to include comment cells (in Notebook Mode)
4. The Markdown file will be downloaded to your computer

### PDF Export

1. Click the "Export" button in the header
2. Select a theme for your PDF
3. Choose whether to include comment cells (in Notebook Mode)
4. Click "Export to PDF"
5. The PDF file will be downloaded to your computer

## Tips and Best Practices

- **Use Comment Cells**: In Notebook Mode, use comment cells to add notes or explanations that won't be included in the final export (unless you choose to include them)
- **Organize Snippets**: Create a folder structure that makes sense for your workflow
- **Preview Regularly**: Switch between edit and view modes to see how your content will look when rendered
- **Use Formatting**: Apply appropriate formatting to make your content more readable and structured
- **Group Related Cells**: Use cell grouping to organize related content together

## Keyboard Shortcuts

- **Ctrl+S**: Save current work
- **Ctrl+E**: Toggle between edit and view mode for the selected cell
- **Ctrl+Up/Down**: Move the selected cell up or down
- **Ctrl+D**: Delete the selected cell

## Troubleshooting

### Content Not Rendering Correctly

- Make sure your Markdown syntax is correct
- Check that you haven't accidentally included formatting characters that might interfere with rendering

### Nodes Not Connecting

- Ensure you're dragging from an output connector to an input connector
- Check that you're not trying to create a circular reference

### Export Issues

- If PDF export fails, try exporting to Markdown first and then convert to PDF using another tool
- Make sure your content doesn't contain unsupported characters or formatting

## Getting Help

If you encounter any issues or have questions about using ModuPrompt, please:
- Check this user guide for instructions
- Look for example templates in the application
- Contact support at support@moduprompt.com
