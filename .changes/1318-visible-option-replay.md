### Fixed

- **`@reticlehq/browser` — replaying a custom select clicked the hidden native option and reported success.** A saved flow that targeted a choice by role and name resolved the visually-hidden `<option>` a library such as Radix keeps for form submission, dispatched the click, and left the selected value unchanged. The same role and name now resolve to the visible portal option, and that click is the one that changes the selection. Closes [#1318](https://github.com/reticlehq/reticle/issues/1318).
