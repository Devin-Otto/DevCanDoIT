# Pet Export Bundle

This folder is a portable asset pack for four finished pets:

- `donut`: donut
- `mr-crabs`: Mr. Crabs
- `mark`: mark
- `kittylion`: kittylion

It is designed to work as a generic import bundle for a new project without requiring the original hatch pipeline or this repo's runtime code.

## What Is Included

- `bundle-manifest.json`: machine-readable index for the whole bundle
- one folder per pet with runtime assets and source/import assets
- Codex-compatible files: `pet.json` + `spritesheet.webp`
- broader-compatibility atlas export: `spritesheet.png`
- decoded row strips for all 9 states
- per-frame PNG exports for each state
- reference images, canonical base images, contact sheets, QA JSON, and preview videos

## Shared Atlas Spec

- atlas size: `1536x1872`
- cell size: `192x208`
- atlas outputs: transparent `spritesheet.webp` and `spritesheet.png`
- state order:
  - `idle`
  - `running-right`
  - `running-left`
  - `waving`
  - `jumping`
  - `failed`
  - `waiting`
  - `running`
  - `review`

## State Meanings

- `idle`: Neutral loop for default standing or resting behavior.
- `running-right`: Fast locomotion loop facing right.
- `running-left`: Fast locomotion loop facing left.
- `waving`: Short greeting or acknowledgement animation.
- `jumping`: Anticipation, lift, apex, and landing sequence.
- `failed`: Setback, stumble, or upset reaction loop.
- `waiting`: Patient, low-energy holding loop while idle in context.
- `running`: Generic movement loop when left/right facing is not required.
- `review`: Focused inspection or thinking loop for analysis-style moments.

## Running-Left Mirroring

- `donut`: `running-left` is a mirrored version of `running-right`.
- `mr-crabs`: `running-left` is a mirrored version of `running-right`.
- `mark`: `running-left` is a mirrored version of `running-right`.
- `kittylion`: `running-left` is a mirrored version of `running-right`.

## Minimum Import Path

Use this path when the new project already understands Codex-style pet packages:

1. Copy a pet folder into the new project.
2. Read its `pet.json`.
3. Load `spritesheet.webp` using the relative path in `pet.json`.
4. Use the per-pet `manifest.json` if you need atlas dimensions, state order, or frame counts.

## Full Custom Integration Path

Use this path when the new project has its own animation system:

1. Read `bundle-manifest.json` or the per-pet `manifest.json`.
2. Choose whether to consume:
   - `spritesheet.webp` / `spritesheet.png` for atlas-based animation, or
   - `decoded/` row strips for custom slicing, or
   - `frames/` for direct per-frame playback
3. Map the 9 standard state ids to your engine's animation states.
4. Use `reference/` and `qa/` assets to verify imported animation fidelity.

## Transparency Notes

- Final atlases are transparent RGBA outputs.
- The hatch pipeline used a cyan chroma-key intermediate (`#00FFFF`) during extraction, but the exported final atlases and frame PNGs are already transparency-cleaned.
- The `decoded/` strips are included as approved source strips from the finalized run and may still reflect the original extraction workflow; prefer `frames/` or final atlases for direct runtime use.

## Recommended Files By Use Case

- Codex-compatible pet project:
  - `pet.json`
  - `spritesheet.webp`
- Custom 2D engine or overlay:
  - `manifest.json`
  - `frames/`
  - optionally `spritesheet.png`
- Debugging or art review:
  - `reference/`
  - `qa/contact-sheet.png`
  - `qa/review.json`
  - `qa/videos/`
