# ModuPrompt Testing Checklist

## Node Mode Testing

### Node Selection and Dragging
- [ ] Test selecting a single node (should only select that node)
- [ ] Test dragging a node (should stop dragging when mouse is released)
- [ ] Test clicking on a node's content vs. its header
- [ ] Test selecting multiple nodes (if supported)
- [ ] Test node selection persistence when switching between modes

### Node Connections
- [ ] Test connecting an output to an input
- [ ] Test dragging from an output (should create a connection, not move the node)
- [ ] Test dragging from an input (should create a connection, not move the node)
- [ ] Test disconnecting a connection
- [ ] Test connection persistence when nodes are moved
- [ ] Test connection appearance (should be visible and properly positioned)

### Format Nodes
- [ ] Test creating a format node
- [ ] Test connecting a prompt node to a format node
- [ ] Test applying different formatting options
- [ ] Test format node functionality (should properly format the content)

### Canvas Navigation
- [ ] Test panning the canvas (drag with mouse)
- [ ] Test zooming in and out (Ctrl+wheel)
- [ ] Test horizontal panning (Shift+wheel)
- [ ] Test vertical panning (wheel)
- [ ] Test canvas reset view button

## Notebook Mode Testing

### Cell Selection and Editing
- [ ] Test selecting text within a cell (should not trigger cell movement)
- [ ] Test moving a cell using the cell handle
- [ ] Test editing cell content
- [ ] Test rich text formatting options

### Cell Formatting
- [ ] Test applying code block formatting
- [ ] Test applying blockquote formatting
- [ ] Test applying callout formatting
- [ ] Test applying XML tags formatting
- [ ] Test mutually exclusive formatting options (code block vs XML tags)
- [ ] Test mutually exclusive formatting options (blockquote vs callout)
- [ ] Test removing formatting

## Mode Switching and Synchronization

### Notebook to Node Mode
- [ ] Test creating cells in notebook mode and switching to node mode
- [ ] Test applying formatting in notebook mode and checking if it appears in node mode
- [ ] Test removing formatting in notebook mode and checking if it's removed in node mode

### Node to Notebook Mode
- [ ] Test creating nodes in node mode and switching to notebook mode
- [ ] Test connecting nodes in node mode and switching to notebook mode
- [ ] Test applying formatting in node mode and checking if it appears in notebook mode
- [ ] Test removing formatting in node mode and checking if it's removed in notebook mode

## General Functionality
- [ ] Test snippet panel functionality
- [ ] Test export functionality
- [ ] Test preview functionality
- [ ] Test error handling and edge cases
