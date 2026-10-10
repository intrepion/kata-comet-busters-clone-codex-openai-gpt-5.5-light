# Meteor Breakers

Meteor Breakers is a browser arcade game inspired by classic comet-blasting space shooters. This glossary defines the project language used in design notes, ADRs, code, tests, and UI copy.

## Language

**Meteor Breakers**:
The game being built in this repository: a modern arcade homage with classic inertia, wrapping, fragmenting hazards, score pressure, and escalating waves.
_Avoid_: Comet Busters clone, Asteroids clone, space shooter

**Pilot**:
The player as an in-world role, responsible for surviving waves and clearing comet threats.
_Avoid_: Player character, user, avatar

**Skimmer**:
The Pilot's small maneuverable ship, controlled through rotation, thrust, and firing.
_Avoid_: Ship, spaceship, fighter

**Hybrid Flight**:
The Skimmer's movement feel: real acceleration and drift moderated by gentle damping so recovery remains readable.
_Avoid_: Pure inertia, arcade snap, tank movement

**Comet**:
A large drifting hazard that breaks into smaller hazards when hit.
_Avoid_: Asteroid, rock, meteor

**Shard**:
A smaller hazard created when a Comet breaks apart.
_Avoid_: Fragment, mini-comet, debris

**Large Comet**:
The starting hazard tier in the fragmentation chain.
_Avoid_: Big asteroid, level-one rock

**Medium Shard**:
The middle hazard tier created when a Large Comet breaks.
_Avoid_: Medium comet, fragment

**Small Shard**:
The final hazard tier; destroying it removes that hazard from the Wave.
_Avoid_: Tiny comet, pebble, debris

**Wave**:
A self-contained arcade challenge that ends when all active Comets and Shards are cleared or the Pilot loses all lives.
_Avoid_: Level, round, stage

**First Victory**:
The first successful run milestone, reached by clearing Wave 8.
_Avoid_: Campaign clear, final ending, tutorial completion

**Endless Continuation**:
The optional score-chase state after First Victory where Waves keep escalating.
_Avoid_: New game plus, postgame, survival mode

**Risk Chain**:
A scoring state that grows through clean shooting and near-misses, then resets when the Pilot loses a life.
_Avoid_: Combo, streak, multiplier

**Near-Miss**:
A deliberate close pass by a Comet or Shard that rewards the Pilot for staying near danger without colliding.
_Avoid_: Dodge bonus, graze, close call

**Comet Variant**:
A hazard behavior introduced gradually across Waves to increase challenge without making every object simply faster.
_Avoid_: Enemy type, asteroid class, modifier

**Unstable Comet**:
A rare Comet Variant that creates extra pressure through less predictable fragmentation or movement.
_Avoid_: Special asteroid, boss rock, chaos comet

**Core Comet**:
The Wave 8 setpiece Comet that sheds Shards in phases and creates the First Victory challenge.
_Avoid_: Boss, enemy ship, final monster

**Overdrive**:
A temporary offensive score state earned through skillful play, especially near-misses and clean shooting.
_Avoid_: Shield, bomb, generic boost

**Hangar**:
The between-run or between-wave context for options, best scores, and future progression.
_Avoid_: Menu, lobby, garage

**MVP Hangar**:
The first Hangar scope: start or restart, controls, best score, mute, and First Victory marker.
_Avoid_: Upgrade shop, metagame, loadout screen

**Local Record**:
Browser-local saved arcade progress, limited to best score, best Wave, mute preference, and First Victory completion.
_Avoid_: Save file, profile, campaign state

**Recovery Window**:
A short post-collision state where the Pilot respawns with temporary invulnerability.
_Avoid_: Grace period, spawn shield, mercy time

**Screen Wrap**:
The playfield rule where the Skimmer, Comets, Shards, and shots leave one edge and re-enter from the opposite edge.
_Avoid_: Teleport edge, boundary loop, wall pass

**Threat Priority**:
The visual readability rule that hazards must remain clearer than effects, particles, stars, score popups, or Overdrive visuals.
_Avoid_: Visual polish, effects-first, juice

**Minimal Synth Arcade**:
The audio identity: compact synthesized feedback for thrust, shots, splits, life loss, and Overdrive without depending on music.
_Avoid_: Cinematic score, retro beeps only, soundtrack-first audio

**Direct-File Launch**:
The user-facing browser launch path where the game runs from a double-clicked local HTML file without requiring a development server.
_Avoid_: Localhost-only launch, Vite entry, source module launch
