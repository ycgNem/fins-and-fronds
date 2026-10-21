// Print archetype ids, names and blurbs (for writing art prompts).
import { ARCHETYPES, REGIONS } from '../src/data';
for (const a of ARCHETYPES) console.log(`A|${a.id}|${a.name}|${a.blurb}`);
for (const r of REGIONS) console.log(`R|${r.id}|${r.name}|${r.scape}`);
