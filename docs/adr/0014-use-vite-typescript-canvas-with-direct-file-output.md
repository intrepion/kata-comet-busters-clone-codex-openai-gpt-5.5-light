# Use Vite TypeScript Canvas with Direct-File Output

The implementation stack will be Vite, TypeScript, and Canvas with Playwright coverage plus a generated Direct-File Launch. A dependency-free static build would be simpler, but the movement, scoring, Wave, and persistence rules benefit from typed seams and browser regression tests.

## Consequences

The development entry and user-facing direct-file artifact must remain separate. A successful dev-server run is not enough; the generated local HTML launch path must be tested as its own acceptance surface.
