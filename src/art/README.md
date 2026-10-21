# Imported art

Sprite sheets that ship with the game. Each sheet is a pair:

- `<sheet>.png`: palette-quantized pixels (Resurrect 64), transparent background.
- `<sheet>.json`: where each named sprite sits in the sheet.

```json
{
  "frames": {
    "sp:cherry_shrimp:0": { "x": 0, "y": 0, "w": 22, "h": 12, "ax": 11, "ay": 6 },
    "it:spider_wood": { "x": 22, "y": 0, "w": 50, "h": 47, "ax": 25, "ay": 46 }
  }
}
```

`ax`/`ay` is the anchor: the center for creatures, the bottom center for scape items (top center
for floating plants). If omitted, the anchor is the bottom center.

Every `*.json` here is picked up at build time by `loadImportedArt()` in
`src/render/art/sprites.ts`; a name defined here replaces the procedural sprite of that name.
Sheets are written by the importer (art/README.md), not by hand.
