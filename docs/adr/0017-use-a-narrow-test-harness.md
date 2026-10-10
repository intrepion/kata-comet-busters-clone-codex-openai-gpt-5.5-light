# Use a Narrow Test Harness

Meteor Breakers will expose a narrow Test Harness for deterministic browser verification in test contexts. It may support setup, stepping, and state inspection, but it should not become a general debug menu or a gameplay feature.

## Consequences

Playwright tests can verify real mechanics without brittle visual guessing. The Test Harness must stay small enough that tests still exercise the actual game loop rather than a parallel simulation.
