# Verify Each Slice with Rules and Browser Tests

Each Playable Slice must be verified with pure rule tests where useful and Playwright coverage for real browser interaction. Once Direct-File Launch exists, the generated local artifact must also have Playwright coverage before a slice is considered complete.

## Consequences

Build success and unit tests are insufficient evidence for this game. Movement, wrapping, collision feel, and readability must be exercised through the same browser path a player uses.
