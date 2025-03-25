# ModuPrompt Implementation Todo List

## High Priority Issues

- [x] **Node Connection Creation**
  - [x] Fix drag from outputs to inputs for connection creation
  - [x] Implement visual feedback during connection dragging
  - [x] Ensure connections persist when nodes are moved

- [x] **Mode Synchronization**
  - [x] Ensure formatting changes in one mode are reflected in the other
  - [x] Fix XML formatting synchronization between modes

## Medium Priority Issues

- [ ] **Notebook Mode Issues**
  - [x] Fix drag and drop error between cells
  - [ ] Implement formatting in exports
  - [ ] Fix PDF export to render markdown properly

- [ ] **Node Mode UI Improvements**
  - [ ] Add input and output labels to nodes
  - [ ] Improve canvas navigation with better user feedback

## Low Priority Issues

- [ ] **Snippet Functionality**
  - [ ] Implement saving prompt cells to snippets
  - [ ] Improve snippet drag and drop functionality

- [ ] **Filter Node Implementation**
  - [ ] Make filter nodes non-editable
  - [ ] Use same filter options as notebook mode
  - [ ] Create separate filter nodes as inputs per prompt node when switching modes

- [ ] **Documentation Updates**
  - [ ] Update user guide with improved functionality
  - [ ] Add examples of proper usage for both modes
