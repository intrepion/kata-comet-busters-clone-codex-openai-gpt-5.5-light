# Use Hybrid Flight Feel

The Skimmer will use real acceleration and drift, moderated by gentle damping, instead of pure classic inertia or snappy arcade movement. This preserves the skill of rotational thrust while keeping recovery legible for modern browser play.

## Consequences

Movement tests and browser play checks must verify both sides of the contract: the Skimmer should drift enough to feel physical, but damping should prevent the ship from feeling out of control after ordinary course corrections.
