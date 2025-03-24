# ModuPrompt Issues Document

## Node Mode Issues

### Node Selection and Dragging
- **Issue 1**: Clicking any single node selects all nodes
  - When clicking on a node, all nodes are selected instead of just the clicked node
  - This makes it difficult to work with individual nodes
  
- **Issue 2**: Forced dragging even when not holding click
  - After clicking a node, it continues to be in dragging mode even after releasing the mouse button
  - User has to click elsewhere to exit the dragging mode
  
### Node Connections
- **Issue 3**: Cannot drag from outputs/inputs to create connections
  - When attempting to drag from an output or input, it drags the entire node instead
  - This prevents creating connections between nodes
  
- **Issue 4**: Format node connections don't work properly
  - When trying to connect a Format node, the connections don't appear until clicking on an existing output
  - When moving the connected prompt node, the connection doesn't stay
  - Cannot unplug the output of a prompt node from the input of another node

### Canvas Navigation
- **Issue 5**: Canvas navigation problems
  - Cannot pan the node chart workspace
  - No visual feedback during panning operations
  - Difficult to navigate when working with multiple nodes

### Format Node Functionality
- **Issue 6**: Format node lacks functionality
  - Format nodes don't have any formatting options
  - Cannot configure the format node after creation

## Notebook Mode Issues

### Cell Selection and Movement
- **Issue 7**: Text selection vs. cell movement problems
  - Text selection doesn't work properly - always selects the whole cell for moving
  - Cell movement should only trigger when hovering over the designated cell handle
  - Cannot select text within cells for editing without triggering cell movement

### Formatting Issues
- **Issue 8**: Toolbar functionality issues
  - Toolbar doesn't work properly with actual formatting
  - Formatting buttons don't consistently apply the expected formatting

### Formatting Toggle Implementation
- **Issue 9**: Formatting toggle logic not implemented
  - Code Block and XML should be exclusive to each other
  - Blockquote and Callout should be exclusive to each other
  - Any other combinations should be valid
  - Currently, these exclusivity rules are not properly implemented

## Mode Synchronization Issues

### Formatting Synchronization
- **Issue 10**: Formatting synchronization between modes
  - When XML formatting is applied in Notebook Mode, it appears in Node Mode with a Format node connected to the Prompt node
  - When removing XML formatting from a cell (added in Node Mode originally), it's not removed from the node
  - Formatting changes in one mode don't properly reflect in the other mode

### Content Synchronization
- **Issue 11**: Content synchronization verification needed
  - Need to verify if content changes in one mode are properly reflected in the other mode
  - Ensure content consistency between modes

## Testing Progress
I've thoroughly tested both Node Mode and Notebook Mode, as well as the synchronization between them. Key observations:

1. Node Mode issues include selection problems, persistent dragging state, connection difficulties, and format node limitations
2. Notebook Mode issues include text selection problems and formatting toolbar inconsistencies
3. Mode synchronization issues include formatting changes not being properly reflected when switching between modes
4. Formatting toggle exclusivity rules are not properly implemented

These issues align with the user's reported problems and require fixes to ensure proper functionality of the application.
