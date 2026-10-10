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

**Comet**:
A large drifting hazard that breaks into smaller hazards when hit.
_Avoid_: Asteroid, rock, meteor

**Shard**:
A smaller hazard created when a Comet breaks apart.
_Avoid_: Fragment, mini-comet, debris

**Wave**:
A self-contained arcade challenge that ends when all active Comets and Shards are cleared or the Pilot loses all lives.
_Avoid_: Level, round, stage

**Overdrive**:
A temporary power state earned through skillful play and used to intensify the arcade loop.
_Avoid_: Power-up mode, boost, special

**Hangar**:
The between-run or between-wave context for options, best scores, and future progression.
_Avoid_: Menu, lobby, garage

**Direct-File Launch**:
The user-facing browser launch path where the game runs from a double-clicked local HTML file without requiring a development server.
_Avoid_: Localhost-only launch, Vite entry, source module launch
