// Progression: the shop's tiers (reputation), upgrade tracks, the correspondents who write
// letters, their requests, and animal partnerships. The story: you take over Ida Fenwick's
// closed-down fish shop and grow it, tank by tank, into the town's aquarium. Correspondents are
// known by their stationery and their handwriting; Ida also appears in the cutscenes.
import type { CorrespondentDef, ProjectDef, RequestDef, SymbiosisDef, TierDef, UpgradeDef, WeekEventDef } from './types';

export const TIERS: TierDef[] = [
  { level: 0, name: 'Little Fish Shop', rep: 0, bays: 1, racks: 1, unlocks: 'One display bay in the front window, freshwater, the supplier\'s starter list.' },
  { level: 1, name: 'Neighborhood Fish Shop', rep: 130, bays: 2, racks: 2, unlocks: 'A second display bay, CO2, bigger tanks, paludariums and ripariums, small chillers and coldwater natives, the first expeditions.' },
  { level: 2, name: 'Aquarium Store', rep: 450, bays: 3, racks: 3, unlocks: 'Brackish water, mangroves, bigger chillers and coldwater specialists.' },
  { level: 3, name: 'Town Aquarium', rep: 2300, bays: 5, racks: 4, unlocks: 'The shop becomes a public aquarium: saltwater and reefs, koi ponds and touch pools.' },
  { level: 4, name: 'Regional Aquarium', rep: 5800, bays: 7, racks: 6, unlocks: 'Kreisels, kelp towers, ray lagoons, SPS reefs and big sharks.' },
  { level: 5, name: 'Grand Oceanarium', rep: 13500, bays: 10, racks: 8, unlocks: 'The ocean window and the deep chamber.' },
];

export const UPGRADES: UpgradeDef[] = [
  // tanks
  { id: 'extra_bays', track: 'tanks', name: 'Extra Bays', levels: [
    { cost: 300, tier: 1, text: '+1 tank bay.' }, { cost: 1200, tier: 2, text: '+1 more bay.' }, { cost: 4000, tier: 3, text: '+1 more bay.' },
    { cost: 9000, tier: 4, text: 'A new wing: +1 more bay.' }, { cost: 20000, tier: 5, text: 'The east hall: +1 more bay.' }] },
  { id: 'quarantine', track: 'tanks', name: 'Quarantine & Plant Dip', levels: [
    { cost: 150, tier: 0, text: 'New plants and rock are dipped: hitchhiking pest snails and Aiptasia never get in.' }] },
  { id: 'glazier', track: 'tanks', name: 'Glazier\'s Discount', levels: [
    { cost: 200, tier: 1, text: 'New tanks cost 15% less.' }, { cost: 800, tier: 3, text: 'New tanks cost 30% less.' }] },
  // care
  { id: 'test_kits', track: 'care', name: 'Liquid Test Kits', levels: [
    { cost: 60, tier: 0, text: 'Exact water readings instead of test-strip guesses.' }] },
  { id: 'auto_feeders', track: 'care', name: 'Feeding Rota', levels: [
    { cost: 120, tier: 0, text: 'Every tank is fed on schedule, even without an auto feeder.' }] },
  { id: 'seeded_media', track: 'care', name: 'Seeded Filter Media', levels: [
    { cost: 180, tier: 0, text: 'New tanks start with mature media: half cycled from day one.' },
    { cost: 600, tier: 2, text: 'New tanks start fully cycled.' }] },
  { id: 'auto_water', track: 'care', name: 'Water Change System', levels: [
    { cost: 400, tier: 1, text: 'A small automatic water change every day.' }, { cost: 1500, tier: 3, text: 'Larger daily changes and auto top-off everywhere.' }] },
  // the more tanks, the more glass: volunteers, then a crew, do the morning round before opening
  { id: 'cleaning_crew', track: 'care', name: 'Cleaning Crew', levels: [
    { cost: 600, tier: 2, text: 'Volunteer docents wipe the nose prints off every tank before opening.' },
    { cost: 2500, tier: 3, text: 'A cleaning crew scrapes the algae off every tank\'s glass too.' }] },
  // visitors
  { id: 'benches', track: 'visitors', name: 'Viewing Benches', levels: [
    { cost: 100, tier: 0, text: 'Visitors linger longer: +10% income.' }, { cost: 500, tier: 2, text: '+10% more.' }, { cost: 2000, tier: 4, text: '+10% more.' }] },
  { id: 'placards', track: 'visitors', name: 'Codex Placards', levels: [
    { cost: 150, tier: 0, text: 'Recognized tank types earn 25% more reputation.' }] },
  { id: 'donation_box', track: 'visitors', name: 'Donation Box', levels: [
    { cost: 200, tier: 1, text: 'Happy tanks earn extra donations.' }, { cost: 900, tier: 3, text: 'Bigger donations.' }] },
  { id: 'gift_shop', track: 'visitors', name: 'Gift Shop', levels: [
    { cost: 600, tier: 2, text: 'A little shop by the exit earns coins whenever visitors come.' }, { cost: 2500, tier: 4, text: 'Plush seahorses sell out every weekend.' }] },
  { id: 'night_openings', track: 'visitors', name: 'Night Openings', levels: [
    { cost: 500, tier: 2, text: 'Evening visitors come to see nocturnal and glowing animals.' }] },
  // expeditions
  { id: 'better_nets', track: 'expeditions', name: 'Better Nets', levels: [
    { cost: 200, tier: 1, text: 'Expeditions find rarer species.' }, { cost: 900, tier: 3, text: 'Much rarer.' }] },
  { id: 'faster_boat', track: 'expeditions', name: 'Faster Boat', levels: [
    { cost: 250, tier: 1, text: 'Expeditions return 25% sooner.' }, { cost: 1000, tier: 3, text: '50% sooner.' }] },
  { id: 'second_crew', track: 'expeditions', name: 'Second Crew', levels: [
    { cost: 800, tier: 2, text: 'Run two expeditions at once.' }] },
  // decor: each set's pieces are sold only with the set; a tank with the whole set draws more
  // visitors, and more again in the kind of tank it suits (src/sim/Game.ts, BAL.setBonus)
  { id: 'set_galleon', track: 'decor', name: 'Galleon Set', levels: [{ cost: 120, tier: 1, text: 'The sunken galleon and its treasure chest. A tank with both draws more visitors, a whimsy tank most.' }] },
  { id: 'set_ruins', track: 'decor', name: 'Lost City Set', levels: [{ cost: 160, tier: 1, text: 'Columns and amphorae. A tank with the whole set draws more visitors.' }] },
  { id: 'set_zen', track: 'decor', name: 'Zen Garden Set', levels: [{ cost: 160, tier: 1, text: 'Lantern and bridge. A tank with both draws more visitors, a coldwater or pond tank most.' }] },
  { id: 'set_toybox', track: 'decor', name: 'Toybox Set', levels: [{ cost: 80, tier: 0, text: 'The toy castle and the bubbling clam. Children adore them: a tank with both draws more, a whimsy tank most.' }] },
  // husbandry
  { id: 'breeding_nets', track: 'husbandry', name: 'Breeder Boxes', levels: [
    { cost: 150, tier: 0, text: 'More fry survive to adulthood.' }, { cost: 600, tier: 2, text: 'Many more.' }] },
  { id: 'selective_breeding', track: 'husbandry', name: 'Selective Breeding', levels: [
    { cost: 250, tier: 1, text: 'Neocaridina colonies improve their color grade over generations.' }] },
  { id: 'fry_club', track: 'husbandry', name: 'Hobbyist Club', levels: [
    { cost: 200, tier: 1, text: 'Local hobbyists take your surplus: animals rehomed from holding fetch half their price, not 30%.' }] },
  { id: 'fragging', track: 'husbandry', name: 'Coral Fragging', levels: [
    { cost: 400, tier: 3, text: 'Overgrown corals can be fragged into new colonies.' }] },
  // (the old Conservation Fund levels are now repeatable projects: PROJECTS below)
];

/** Conservation and breeding projects: a coin sink that never runs dry. Each can be funded again
 *  and again for more each time (src/sim/projects.ts); every funding sends a line from the people
 *  running it, and the shop gets more visitors (a town proud of its aquarium) or a new species. */
export const PROJECTS: ProjectDef[] = [
  { id: 'river', name: 'The Larkwater clean-up', from: 'driftwood', tier: 2, cost: 2000, rep: 80, region: 'temperate_eu', effect: { visitors: 0.02 },
    blurb: 'The little river through town has been a dumping ground for years. The Driftwood Club wants it back.',
    lines: [
      'Forty bags of rubbish and one old pram out of the Larkwater. The kingfisher is back at the weir.',
      'The weir has a fish pass now. Somebody saw a brown trout jump below the bridge on Sunday.',
      'Willows planted along the bank. The water runs clear enough to count the stones.',
      'Another season on the Larkwater. Children paddle there again, and so do the minnows.'] },
  { id: 'axolotl', name: 'An axolotl refuge', from: 'okafor', tier: 2, cost: 1600, rep: 60, region: 'xochimilco', effect: { unlock: 'axolotl', visitors: 0.01 },
    blurb: 'Wild axolotls survive only in a few canals of Xochimilco. Room 4 wants to help the farmers keep a canal clean for them.',
    lines: [
      'A refuge canal is fenced off from carp and tilapia. Room 4 sent a card with forty axolotls on it. The lab\'s captive-bred axolotls are on your supplier\'s list now.',
      'The farmers count more axolotls in the refuge canal this spring. Room 4 has a chart on the wall.',
      'A second canal is clean. The class axolotl is called Señor Sonrisa.',
      'Another year for the canals of Xochimilco: the axolotls are holding on.'] },
  { id: 'reef', name: 'A coral nursery on Sandy Reef', from: 'reyes', tier: 3, cost: 5000, rep: 200, region: 'indo_pacific', effect: { visitors: 0.02 },
    blurb: 'Coral fragments grown on underwater trees, then planted back on a reef the storms broke. Dr. Reyes dived it when it was whole.',
    lines: [
      'The first coral tree is in the water: two hundred staghorn fragments, growing.',
      'The nursery planted its first patch back on the reef. Reyes says the damselfish moved in within a week.',
      'Three more trees, and the reef patch spawned on the full moon. I cried a little, writes Reyes.',
      'Another season of the nursery: the planted patch is joining up with the old reef.'] },
  { id: 'museum', name: 'The museum\'s rivers gallery', from: 'nwosu', tier: 3, cost: 6000, rep: 240, region: 'rio_negro', effect: { visitors: 0.03 },
    blurb: 'The city museum is building a gallery on the world\'s rivers, with a sign pointing visitors to your aquarium.',
    lines: [
      'The rivers gallery has a floor and a roof. The sign by the door reads: Now see them alive, two streets east.',
      'A flooded-forest diorama is in, with a recording of the Rio Negro at night. The school groups love it.',
      'The gallery opened. Visitors walk straight from it to your door, says the curator, map in hand.',
      'Another case for the rivers gallery: the museum adds a little more each year.'] },
  { id: 'seahorse', name: 'Seahorse breeding program', from: 'junie', tier: 4, cost: 12000, rep: 450, region: 'seagrass', effect: { visitors: 0.02 },
    blurb: 'Junie wrote to ask whether seahorses could have their babies somewhere safe. Wild ones are taken by the million for trinkets; a breeding program raises them for aquariums instead, and replants seagrass for the wild ones.',
    lines: [
      'The first batch of captive-bred seahorse fry: three hundred, each smaller than a grain of rice. Junie sent a drawing of all of them.',
      'Half an acre of seagrass replanted in the lagoon. The divers found a pregnant male in it.',
      'The program\'s seahorses now supply three aquariums, so none come from the wild.',
      'Another season of seahorse fry, and the meadow keeps growing.'] },
  { id: 'kelp', name: 'Replanting the kelp', from: 'wren', tier: 4, cost: 14000, rep: 520, region: 'kelp_forest', effect: { visitors: 0.02 },
    blurb: 'Urchins have eaten the kelp off a stretch of coast down to bare rock. Divers clear them, and the forest can grow back.',
    lines: [
      'Divers cleared the urchins off a hundred meters of bare rock. Wren ferried them out at dawn.',
      'Kelp is back on the cleared rock, a meter a week. The sea otters found it first.',
      'The forest is closing over the cleared patch. Wren says you can hear it from the boat: the sea goes quiet.',
      'Another season of kelp: the forest is wider every year.'] },
  { id: 'reserve', name: 'A marine reserve', from: 'nwosu', tier: 5, cost: 30000, rep: 1000, region: 'open_ocean', effect: { visitors: 0.02 },
    blurb: 'A stretch of sea where no one fishes, so everything in it can grow old. The museum and the aquarium are founding it together.',
    lines: [
      'The reserve has a name and buoys on its corners. Wren sailed its edge and says it looks like any sea, for now.',
      'The first survey: the fish inside are already bigger than the fish outside.',
      'Groupers in the reserve again, the first in thirty years. The fishermen just outside are catching more too.',
      'Another year for the reserve: the sea inside it keeps getting older and fuller.'] },
];

/** The days of the week (day 1 is a Monday). */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** What happens on each day of the week (src/sim/week.ts); the other days are quiet. */
export const WEEK: WeekEventDef[] = [
  { id: 'bench', day: 1, name: 'Dr. Reyes\'s bench', from: 'reyes', text: 'Tuesday: Dr. Reyes is on her bench, and word gets round about the healthiest tanks.' },
  { id: 'school', day: 4, name: 'Room 4\'s school trip', from: 'okafor', text: 'Friday: Room 4 is here on their school trip! Children crowd the tanks with the most to see, and spend pocket money.' },
  { id: 'market', day: 5, name: 'Market day', from: 'tomas', text: 'Saturday: market day, and Grandpa Tomás is in as always. Crowds all day, and shoppers for the stock room.' },
  { id: 'judging', day: 6, name: 'The Driftwood Club\'s judging', from: 'driftwood', text: 'Sunday: the Driftwood Club is judging. Word follows the best scapes, and the best of all gets a rosette at four.' },
];

/** Codex milestones: rewards for filling the codex, and a plaque in the codex for each one
 *  (n 0 means all of them). Each finished family of tank types earns a plaque too. */
export const CODEX_MILESTONES: { id: string; kind: 'archetypes' | 'species' | 'symbioses'; n: number; name: string; coins: number; rep: number }[] = [
  { id: 'sp25', kind: 'species', n: 25, name: 'Twenty-five species', coins: 100, rep: 15 },
  { id: 'sp50', kind: 'species', n: 50, name: 'Fifty species', coins: 400, rep: 50 },
  { id: 'sp100', kind: 'species', n: 100, name: 'A hundred species', coins: 2000, rep: 200 },
  { id: 'sp150', kind: 'species', n: 150, name: 'A hundred and fifty species', coins: 6000, rep: 500 },
  { id: 'sp_all', kind: 'species', n: 0, name: 'Every species', coins: 15000, rep: 1000 },
  { id: 'ar10', kind: 'archetypes', n: 10, name: 'Ten tank types', coins: 300, rep: 40 },
  { id: 'ar20', kind: 'archetypes', n: 20, name: 'Twenty tank types', coins: 1500, rep: 150 },
  { id: 'ar35', kind: 'archetypes', n: 35, name: 'Thirty-five tank types', coins: 5000, rep: 400 },
  { id: 'ar50', kind: 'archetypes', n: 50, name: 'Fifty tank types', coins: 10000, rep: 700 },
  { id: 'ar_all', kind: 'archetypes', n: 0, name: 'Every tank type', coins: 20000, rep: 1500 },
  { id: 'sy3', kind: 'symbioses', n: 3, name: 'Three partnerships', coins: 300, rep: 40 },
  { id: 'sy_all', kind: 'symbioses', n: 0, name: 'Every partnership', coins: 4000, rep: 300 },
];

export const CORRESPONDENTS: CorrespondentDef[] = [
  { id: 'ida', name: 'Ida Fenwick', role: 'who ran Fins & Fronds for forty-one years and handed you the keys', stationery: 'sage', signoff: 'Love, Ida. (Mind the buckets.)' },
  { id: 'reyes', name: 'Dr. Marisol Reyes', role: 'a retired marine biologist who sits on the same bench every Tuesday', stationery: 'sky', signoff: 'Warmly, M. Reyes' },
  { id: 'okafor', name: "Mr. Okafor's Class", role: 'Room 4 of the primary school down the road, who visit every Friday', stationery: 'yellow', signoff: 'From all of Room 4!!' },
  { id: 'driftwood', name: 'The Driftwood Club', role: 'the town aquascaping society, who meet in the café across the street', stationery: 'green', signoff: 'Yours in hardscape, The Driftwood Club' },
  { id: 'wren', name: 'Captain Wren', role: 'the skipper who runs your collecting trips and writes from every port', stationery: 'teal', signoff: 'Fair winds, Wren' },
  { id: 'tomas', name: 'Grandpa Tomás', role: 'a retired koi keeper who never misses a weekend', stationery: 'orange', signoff: 'Tomás' },
  { id: 'nwosu', name: 'Adaeze Nwosu', role: 'curator of natural history at the city museum', stationery: 'purple', signoff: 'With regards, A. Nwosu, Curator' },
  { id: 'junie', name: 'Junie (age 7)', role: 'a very small visitor who draws a fish on every letter', stationery: 'pink', signoff: 'love JUNIE' },
  { id: 'abe', name: 'Abe', role: 'the night watch, who keeps the lights low after closing', stationery: 'navy', signoff: 'Quietly, Abe' },
  { id: 'pip', name: 'Pip of the Shrimp & Snail Society', role: 'a collector of small, slow and wonderful things', stationery: 'rose', signoff: 'Tiny regards, Pip' },
];

// Letters. A letter asks for a tank (its check); when the shop already does what it asks, it
// arrives as a thank-you that opens with its `met` line and can be answered at once. A letter with
// `after` is a reply in that correspondent's story, sent a day after the one it follows; {tank},
// {sp} and {n} in a reply are what answered the letter before it, and {tanks:tank|tanks} is a
// count with its noun (src/sim/letters.ts). The last letter of each story leaves a keepsake, kept in
// the codex and on the shelf in the hall. Rewards grow with the tier:
// about a tenth of the climb to the next tier in reputation, and about a day's takings in coins.
export const REQUESTS: RequestDef[] = [
  // tier 0: Ida's letters come first, then the town finds the shop
  { id: 'ida_window', from: 'ida', tier: 0, first: true, title: 'The window tank', check: { t: 'rating', stars: 3 }, reward: { coins: 60, rep: 10 },
    text: 'Folk judge a fish shop by its window. Get that first tank to three stars, healthy fish and clean glass, and they will start coming in out of the rain.',
    met: 'Three stars in the window already, and I never had to ask. I knew you had the hands for it. Folk judge a fish shop by its window.' },
  { id: 'ida_plants', from: 'ida', tier: 0, first: true, title: 'Living plants', check: { t: 'plant_species', min: 2 }, reward: { coins: 40, rep: 6 },
    text: 'Plastic plants never sold a single fish. Two kinds of real plants, please: they eat the ammonia before your fish ever notice it.',
    met: 'I see real plants in that window already. Good: plastic plants never sold a single fish, and real ones eat the ammonia before your fish ever notice it.' },
  { id: 'first_school', from: 'okafor', tier: 0, title: 'Can they swim together?', check: { t: 'school', size: 8 }, reward: { coins: 60, rep: 10 },
    text: 'Dear Aquarium, we read that some fish swim in a big group called a SCHOOL. Can you make one? We will count them on Friday.',
    met: 'Dear Aquarium, Amara walked past and says you have a SCHOOL of fish already! We will come and count them on Friday.' },
  { id: 'okafor_count', from: 'okafor', tier: 0, after: 'first_school', title: 'We counted!', check: { t: 'none' }, reward: { coins: 40, rep: 8 },
    text: 'We came on Friday and counted the {sp} in {tank}. Amara got {n}. Theo got three hundred because he counted the same ones again. Mr. Okafor says {n} is right. We drew them for our classroom wall.' },
  { id: 'three_plants', from: 'driftwood', tier: 0, title: 'A proper planted tank', check: { t: 'plant_species', min: 3 }, reward: { coins: 50, rep: 8 },
    text: 'We would love to see at least three kinds of plants growing in one of your tanks. Plants are half of every aquarium.',
    met: 'Three kinds of plants growing in one tank: the club has heard all about it. Plants are half of every aquarium, and you know it.' },
  { id: 'glow', from: 'junie', tier: 0, title: 'something that GLOWS', check: { t: 'tag', tag: 'glow', min: 3 }, reward: { coins: 60, rep: 10 },
    text: 'can you get fish that glow like a night lite. 3 of them please. (I drew one)',
    met: 'my mum says you have fish that GLOW like a night lite. I am coming to see them. (I drew one)' },
  { id: 'junie_drawing', from: 'junie', tier: 0, after: 'glow', title: 'my drawing', check: { t: 'none' }, reward: { coins: 30, rep: 6 },
    text: 'I saw the glow fish in {tank}. they are better than a night lite. this is my drawing of them. you can keep it. the blue bit is the glow.' },
  { id: 'cherries', from: 'pip', tier: 0, title: 'A cherry shrimp colony', check: { t: 'species', id: 'cherry_shrimp', min: 10 }, reward: { coins: 70, rep: 12 },
    text: 'Nothing calms me like a swarm of cherry shrimp grazing on moss. Ten would be a start; they will make the rest themselves.',
    met: 'I spent a whole lunch hour watching your cherry shrimp graze. Ten of them at least, and more on the way, I should think.' },
  { id: 'assassins', from: 'pip', tier: 0, when: 'pests', title: 'The snail situation', check: { t: 'pests_clear' },
    reward: { coins: 90, rep: 15, unlock: 'quarantine', spare: { sp: 'assassin_snail', n: 3 } },
    text: 'I noticed little pest snails in your tanks, riding in on new plants. Assassin snails will tidy them up without chemicals. Clear one tank of pests and I will tell you my dipping secret.',
    met: 'Pest snails came in with your plants, I hear, and none are troubling your tanks now. Most shops never manage it. Let me tell you my dipping secret anyway.',
    metDip: 'Your plant dip caught pest snails at the door, I hear, before a single one got into a tank. Most shops never think of it: you found my dipping secret all by yourself. So here is something else: three assassin snails, in case one ever slips past.' },
  { id: 'two_stars', from: 'reyes', tier: 0, title: 'A tank worth sitting by', check: { t: 'rating', stars: 4 }, reward: { coins: 80, rep: 12 },
    text: 'I sit here most Tuesdays. Tidy up that front window until it earns four stars and I will bring my old field notebooks to share.',
    met: 'Four stars in the window: I sat by it all of Tuesday. I will bring my old field notebooks to share.' },
  { id: 'reyes_notebook', from: 'reyes', tier: 0, after: 'two_stars', effect: 'notebook', title: 'The field notebooks', check: { t: 'none' }, reward: { coins: 30, rep: 8 },
    text: 'As promised: forty years of field notebooks, rivers and reefs, water stains and all. I have marked every animal with where it lives. Your codex will know where to look for the ones you have not met yet.' },
  { id: 'bottom', from: 'okafor', tier: 0, title: 'Who lives on the bottom?', check: { t: 'tag', tag: 'scavenger', min: 4 }, reward: { coins: 60, rep: 10 },
    text: 'Amara says some fish live on the floor of the tank and clean up. We want to see four of them doing it.',
    met: 'Amara saw the fish on the floor of your tank cleaning up! We want to come and watch them do it.' },
  { id: 'betta', from: 'junie', tier: 0, title: 'a fancy fighting fish', check: { t: 'archetype', id: 'betta_haven' }, reward: { coins: 70, rep: 12 },
    text: 'my cousin has a betta in a little cup. can you show how a betta SHOULD live. with plants.',
    met: 'I saw your betta. it has plants and a whole house. I told my cousin.' },
  // tier 1
  { id: 'iwagumi', from: 'driftwood', tier: 1, title: 'Stones and grass', check: { t: 'archetype', id: 'iwagumi' }, reward: { coins: 200, rep: 30, unlock: 'frodo_stone' },
    text: 'Our club challenge this season is Iwagumi: odd stones, one carpet, one school. Show us yours, and we will part with a few of our Frodo stones. No shop sells them.',
    met: 'Your Iwagumi is the talk of the café. Please accept a few Frodo stones from the club\'s own pile. No shop sells them.' },
  { id: 'dutch', from: 'driftwood', tier: 1, title: 'A Dutch garden', check: { t: 'archetype', id: 'dutch' }, reward: { coins: 220, rep: 30 },
    text: 'Our oldest member learned scaping in Holland. Plant streets, contrast, no wood. Will you try?',
    met: 'Our oldest member stood at your Dutch tank for an hour and said nothing, which from him is the highest praise.' },
  { id: 'blackwater', from: 'nwosu', tier: 1, title: 'The black river', check: { t: 'archetype', id: 'rio_negro' }, reward: { coins: 240, rep: 35 },
    text: 'The museum is opening an Amazon gallery. A true Rio Negro blackwater biotope next door would complete it.',
    met: 'I visited your blackwater tank on my lunch break. It is truer than our diorama. The Amazon gallery will point visitors to you.' },
  { id: 'africa', from: 'nwosu', tier: 1, title: 'From African waters', check: { t: 'region_tank', continent: 'Africa' }, reward: { coins: 200, rep: 30 },
    text: 'Africa has three great lakes and rainforest streams full of fishes found nowhere else. One biotope from that continent, please.',
    met: 'An African biotope already! Our curators of the great lakes collection would like to thank you.' },
  { id: 'fry', from: 'okafor', tier: 1, title: 'BABY FISH', check: { t: 'fry' }, reward: { coins: 150, rep: 25 },
    text: 'We are learning about life cycles. Did any of your fish have babies? Please say yes.',
    met: 'Theo\'s mum says your fish had BABIES. We are learning about life cycles and this is the best news.' },
  { id: 'three_stars', from: 'reyes', tier: 1, title: 'Four and a half stars', check: { t: 'rating', stars: 4.5 }, reward: { coins: 200, rep: 30 },
    text: 'Healthy animals, clean water, a scape with an idea behind it. Four and a half stars, and I will tell you about the reefs I dived in 1979.',
    met: 'Four and a half stars: healthy animals, clean water, a scape with an idea. I owe you a story about the reefs I dived in 1979.' },
  { id: 'big_fish', from: 'junie', tier: 1, title: 'a BIG fish', check: { t: 'big_fish', cm: 15 }, reward: { coins: 120, rep: 20 },
    text: 'bigger than my hand please',
    met: 'you have a fish BIGGER than my hand. I checked.' },
  { id: 'no_fish', from: 'driftwood', tier: 1, title: 'Plants alone', check: { t: 'no_animals', stars: 2 }, reward: { coins: 160, rep: 25 },
    text: 'A dare: a tank with no animals at all (not a fish, not a shrimp, not a snail) rated two stars on its plants and stones alone.',
    met: 'We saw your tank with no animals in it at all, rated two stars on plants and stones alone. Dare met before we could make it.' },
  { id: 'night', from: 'abe', tier: 1, title: 'After closing', check: { t: 'night' }, reward: { coins: 150, rep: 25 },
    text: 'When the lights go down, some of your fish wake up. A tank with a moonlight and a few night creatures would keep me company.',
    met: 'Your moonlit tank keeps me company on my rounds already. I thought you should know somebody watches it at night.' },
  { id: 'galleon', from: 'junie', tier: 1, title: 'PIRATES', check: { t: 'decor_set', tag: 'set_galleon' }, reward: { coins: 120, rep: 20 },
    text: 'a ship and a treasure chest that bubbles. PLEASE.',
    met: 'I SAW THE PIRATE SHIP. and the chest bubbles!!' },
  { id: 'goldfish', from: 'tomas', tier: 1, title: 'Goldfish done right', check: { t: 'archetype', id: 'goldfish' }, reward: { coins: 160, rep: 25 },
    text: 'Everyone has kept a goldfish in a bowl, and everyone did it wrong. Show them a proper goldfish tank.',
    met: 'I saw your goldfish tank on Saturday. Room to swim, cool water, a good filter. Finally somebody does it right.' },
  { id: 'paludarium', from: 'nwosu', tier: 1, title: 'Land and water', check: { t: 'archetype', id: 'paludarium' }, reward: { coins: 220, rep: 30 },
    text: 'Our wetlands exhibit needs a living counterpart: a paludarium where the water meets the bank.',
    met: 'Your paludarium is everything our wetlands exhibit is not: alive. We would like to send our visitors to you.' },
  { id: 'wren_ports', from: 'wren', tier: 1, title: 'Three ports', check: { t: 'trips', min: 3 }, reward: { coins: 180, rep: 30 },
    text: 'Three trips home and the crew will stop being seasick. Keep sending us out: every river has a fish no shop has netted. They say the Malili lakes of Sulawesi hide shrimp the red of a cardinal\'s coat.',
    met: 'Three trips home already, and the crew has stopped being seasick. They say the Malili lakes of Sulawesi hide shrimp the red of a cardinal\'s coat.' },
  // tier 2
  { id: 'ida_visit', from: 'ida', tier: 2, after: 'ida_window', title: 'I came in on Saturday', check: { t: 'none' }, reward: { coins: 300, rep: 50 },
    text: 'I came in on Saturday and stood at the back like a customer. Nobody knew me! {tanks:tank|tanks}, and a little crowd at {best}. My knees are still done with buckets, but my heart is not done with this shop.' },
  { id: 'axolotl', from: 'okafor', tier: 2, title: 'The smiling one', check: { t: 'species', id: 'axolotl', min: 1 }, reward: { coins: 600, rep: 120 },
    text: 'We voted and the class animal is the AXOLOTL. Do you have one? They regrow their legs! (Mr. Okafor says real ones only live in some canals in Mexico now.)',
    met: 'We voted and the class animal is the AXOLOTL, and YOU HAVE ONE. Can we name it?' },
  { id: 'mangrove', from: 'reyes', tier: 2, title: 'Where rivers meet the sea', check: { t: 'archetype', id: 'mangrove' }, reward: { coins: 800, rep: 145 },
    text: 'Mangroves are nurseries for half the sea. A brackish estuary tank would teach more than any lecture of mine.',
    met: 'Your mangrove tank teaches more than any lecture of mine. Mangroves are nurseries for half the sea, and now the town can see one.' },
  { id: 'symbiosis', from: 'reyes', tier: 2, title: 'Partners', check: { t: 'symbiosis' }, reward: { coins: 600, rep: 120 },
    text: 'Show your visitors two animals that depend on each other. Nature is mostly partnerships.',
    met: 'Two animals living as partners in one of your tanks: I watched them for an hour. Nature is mostly partnerships.' },
  { id: 'four_stars', from: 'nwosu', tier: 2, title: 'Exhibition quality', check: { t: 'rating', stars: 5 }, reward: { coins: 800, rep: 145 },
    text: 'A five-star tank and the museum will list your aquarium in its visitor guide.',
    met: 'A five-star tank, already. The museum will list your aquarium in its visitor guide.' },
  { id: 'nwosu_guide', from: 'nwosu', tier: 2, after: 'four_stars', effect: 'guide', title: 'The visitor guide', check: { t: 'none' }, reward: { coins: 300, rep: 60 },
    text: 'The new visitor guide is printed: page twelve, between the dinosaurs and the gift shop, with a picture of {tank}. Expect a few more visitors with museum maps in their hands.' },
  { id: 'crystal', from: 'pip', tier: 2, title: 'Crystal clear', check: { t: 'archetype', id: 'caridina' }, reward: { coins: 600, rep: 130 },
    text: 'Crystal reds are the hardest shrimp I know: soft water, active soil, cool and steady. Prove me wrong.',
    met: 'Crystal reds, thriving! I have lost more of them than I like to say. You have proved me wrong before I could ask.' },
  { id: 'abe_rounds', from: 'abe', tier: 2, after: 'night', title: 'On my rounds', check: { t: 'none' }, reward: { coins: 300, rep: 50 },
    text: 'Three in the morning, and the {sp} in {tank} were out. I stood there with the torch off for a long time. I have done the night watch for twenty years. This is the first job where I look forward to it.' },
  // tier 3: the shop becomes the Town Aquarium
  { id: 'reef', from: 'reyes', tier: 3, title: 'A living reef', check: { t: 'corals', min: 5 }, reward: { coins: 1800, rep: 200 },
    text: 'Five corals growing in your care. It is how every reefer starts, and how the reefs of my youth looked from a boat.',
    met: 'Five corals already growing in your care. It is how every reefer starts, and how the reefs of my youth looked from a boat.' },
  { id: 'reyes_1979', from: 'reyes', tier: 3, after: 'three_stars', keepsake: 'Dr. Reyes\'s dive logs', title: 'The reefs of 1979', check: { t: 'none' }, reward: { coins: 800, rep: 95 },
    text: 'I promised you a story. 1979, a reef off Sulawesi so thick with fish you could not see the diver beside you. I went back in 2004 and it was rubble. I kept my dive logs for the pages before. They belong in an aquarium more than in my drawer: please keep them.' },
  { id: 'seahorse', from: 'junie', tier: 3, title: 'sea horses', check: { t: 'archetype', id: 'seahorse' }, reward: { coins: 2000, rep: 220 },
    text: 'the dad seahorses have the babies. I want to see them. I drew a seahorse but it looks like a 5',
    met: 'I SAW THE SEAHORSES. the dad one was holding the grass with his tail. I drew him but it looks like a 5' },
  { id: 'junie_fish', from: 'junie', tier: 3, after: 'seahorse', keepsake: 'Junie\'s clay fish', title: 'I made you a fish', check: { t: 'none' }, reward: { coins: 600, rep: 80 },
    text: 'I watched the seahorses in {tank} for a long time. then at school we did clay and I made you a fish. it is every color because I could not choose. it is not a seahorse because seahorses are too hard. put it somewhere good.' },
  { id: 'koi', from: 'tomas', tier: 3, title: 'A proper pond', check: { t: 'archetype', id: 'koi_pond' }, reward: { coins: 2200, rep: 235 },
    text: 'I kept koi for forty years. Build a pond worthy of them and I will tell you all their names.',
    met: 'I sat by your pond on Saturday. Forty years I kept koi, and that is a pond worthy of them. I will tell you all their names.' },
  { id: 'tomas_names', from: 'tomas', tier: 3, after: 'koi', effect: 'name_koi', keepsake: 'Tomás\'s koi scroll', title: 'Their names', check: { t: 'none' }, reward: { coins: 700, rep: 95 },
    text: 'I watched your koi all of Saturday, and now I can tell you their names. The big one with the red saddle is {k1}. The one who comes to the glass first is {k2}. The shy one under the lily is {k3}. My wife painted this scroll the year we dug our first pond. It should hang near koi.' },
  { id: 'touch', from: 'okafor', tier: 3, title: 'Can we touch?', check: { t: 'archetype', id: 'touch_pool' }, reward: { coins: 2200, rep: 235 },
    text: 'Our field trip is next month. Is there anywhere we can (gently!) touch a starfish?',
    met: 'Theo\'s big sister says you have a TOUCH POOL. Our field trip is next month. We will be very gentle.' },
  { id: 'okafor_picture', from: 'okafor', tier: 3, after: 'touch', keepsake: 'Room 4\'s picture of the aquarium', title: 'Our picture', check: { t: 'none' }, reward: { coins: 700, rep: 95 },
    text: 'Thank you for the field trip. Everybody touched the starfish in {tank} with two fingers like you said. Amara wants to be a marine biologist now and so does Theo. Here is our picture of your aquarium. Everybody drew a bit. Theo drew the door.' },
  { id: 'driftwood_cup', from: 'driftwood', tier: 3, after: 'iwagumi', keepsake: 'The Driftwood Club\'s trophy', title: 'Scape of the season', check: { t: 'part', part: 'scape', min: 85 }, reward: { coins: 2000, rep: 220 },
    text: 'Since your Iwagumi the club has watched every tank you build. The season\'s trophy goes to a scape our judges would score eighty-five. Make one, and the trophy lives at your aquarium for good.',
    met: 'The judges scored one of your scapes over eighty-five. The club voted, and the season\'s trophy, carved from a root we pulled out of the Larkwater, lives at your aquarium for good.' },
  { id: 'wren_bottle', from: 'wren', tier: 3, after: 'wren_ports', keepsake: 'Captain Wren\'s ship in a bottle', title: 'Wild ones', check: { t: 'wild', min: 10 }, reward: { coins: 2000, rep: 200 },
    text: 'The crew wants to know the fish we net go somewhere good. Keep ten wild-caught animals on show in your tanks, and I will send you something I made on the long nights at sea.',
    met: 'I came by on shore leave and counted ten of our wild catch on show in your tanks. The crew is proud. Here is something I made on the long nights at sea.' },
  { id: 'pip_colony', from: 'pip', tier: 3, after: 'crystal', keepsake: 'Pip\'s snail under glass', title: 'A proper colony', check: { t: 'kind', kind: 'shrimp', min: 25 }, reward: { coins: 1600, rep: 185 },
    text: 'Twenty-five shrimp of any kind in one tank, grazing and moulting and carrying eggs. That is a colony, and a colony deserves a gift: the shell of my very first mystery snail, under glass these thirty years.',
    met: 'Twenty-five shrimp in one of your tanks, carrying eggs! That is a colony, and a colony deserves a gift: the shell of my very first mystery snail, under glass these thirty years.' },
  { id: 'cleaners', from: 'reyes', tier: 3, title: 'The cleaning station', check: { t: 'tag', tag: 'cleaner', min: 2 }, reward: { coins: 1800, rep: 200 },
    text: 'On every reef there are stations where big fish queue to be cleaned by small ones, even predators. Two cleaners in one tank, please, so your visitors can see the queue.',
    met: 'Two cleaners in one tank, and a queue of fish waiting their turn. Even predators wait at a cleaning station. Your visitors should know that.' },
  { id: 'big_school', from: 'okafor', tier: 3, title: 'A REALLY big school', check: { t: 'school', size: 30 }, reward: { coins: 1600, rep: 185 },
    text: 'We counted eight fish when we were little. Now we are in Year 4 and we can count to a thousand. Thirty fish in one school please.',
    met: 'We counted thirty fish in one school in your aquarium!! Theo counted thirty-one but he counts badly.' },
  { id: 'predator', from: 'junie', tier: 3, title: 'TEETH', check: { t: 'archetype', id: 'predator' }, reward: { coins: 1800, rep: 200 },
    text: 'a tank of fish with TEETH. not mean ones. just teeth.',
    met: 'I saw the fish with TEETH. they were not mean. they just have teeth.' },
  // tier 4: the Regional Aquarium
  { id: 'jellies', from: 'abe', tier: 4, title: 'Lanterns', check: { t: 'archetype', id: 'jelly_kreisel' }, reward: { coins: 3500, rep: 435 },
    text: 'I once saw jellies in a round tank with a blue light behind them. I would sit with that every night.',
    met: 'There are jellies in a round tank at the end of my rounds now, with a blue light behind them. I sit with them every night.' },
  { id: 'abe_lantern', from: 'abe', tier: 4, after: 'jellies', keepsake: 'Abe\'s night-watch lantern', title: 'The lantern', check: { t: 'none' }, reward: { coins: 1200, rep: 155 },
    text: 'Twenty years I carried this lantern on my rounds. With the jellies glowing in {tank} I do not need it any more: the aquarium lights my way. Put it somewhere it can rest.' },
  { id: 'kelp', from: 'reyes', tier: 4, title: 'The forest under the sea', check: { t: 'archetype', id: 'kelp_forest' }, reward: { coins: 4000, rep: 490 },
    text: 'A kelp forest indoors: cold water, surge and light. It is the most ambitious tank there is. Almost.',
    met: 'A kelp forest indoors, swaying in the surge. It is the most ambitious tank there is. Almost.' },
  { id: 'five_stars', from: 'nwosu', tier: 4, title: 'A perfect reef', check: { t: 'water', is: 'marine', stars: 5 }, reward: { coins: 4000, rep: 490 },
    text: 'A five-star saltwater tank. The museum would like to commission a plaque.',
    met: 'A five-star saltwater tank already. The museum would like to commission a plaque.' },
  { id: 'nwosu_plaque', from: 'nwosu', tier: 4, after: 'five_stars', keepsake: 'The museum\'s plaque', title: 'The plaque', check: { t: 'none' }, reward: { coins: 1200, rep: 155 },
    text: 'The plaque is made. It reads: FINS & FRONDS, IN RECOGNITION OF {tank}, A LIVING EXHIBIT OF THE FIRST RANK. The museum hopes it will hang where people can read it.' },
  { id: 'shark', from: 'junie', tier: 4, title: 'a SHARK', check: { t: 'archetype', id: 'shark_lagoon' }, reward: { coins: 4000, rep: 460 },
    text: 'a real SHARK. a little one is ok. I am 9 now so I am not scared.',
    met: 'there is a REAL SHARK in your aquarium. I am 9 now and I was not scared. a bit.' },
  { id: 'octopus', from: 'okafor', tier: 4, title: 'Eight arms', check: { t: 'archetype', id: 'cephalopod' }, reward: { coins: 4000, rep: 460 },
    text: 'Year 5 is learning about octopuses. They have three hearts and blue blood and they can open jars! Can you keep one? (Mr. Okafor says it needs a very good lid.)',
    met: 'You have an OCTOPUS. Three hearts and blue blood! We hope it has a very good lid.' },
  { id: 'sps', from: 'driftwood', tier: 4, title: 'Stony corals', check: { t: 'archetype', id: 'sps_reef' }, reward: { coins: 4500, rep: 490 },
    text: 'The club has always kept to freshwater, but one of us has gone over to reefs and will not stop talking about stony corals. An SPS reef, please, so we can see what the fuss is about.',
    met: 'We came to see what the fuss is about stony corals. Your SPS reef settled it: two more members have gone over to the salt.' },
  // tier 5: the Grand Oceanarium, and after
  { id: 'ida_last', from: 'ida', tier: 5, first: true, when: 'finale', keepsake: 'Ida\'s old key ring', title: 'The last letter', check: { t: 'none' }, reward: { coins: 2000, rep: 200 },
    text: 'I sat on the step this morning and watched the sun come up on the Grand Oceanarium. Forty-one years I kept a fish shop on this corner. You kept the shop and grew an ocean: {tanks:tank|tanks} and {types:kind|kinds} of tank. I counted. Here is my old key ring, brass fish and all. The keys are yours already; the fish always belonged to the shop. Now go and find the waters nobody has kept yet.' },
  { id: 'deep', from: 'reyes', tier: 5, title: 'The midnight zone', check: { t: 'archetype', id: 'deep_sea' }, reward: { coins: 6000, rep: 600 },
    text: 'Most of the ocean is dark and cold, and almost nobody ever sees it. Let them see a little.',
    met: 'I sat by your deep chamber in the dark for an hour. Most of the ocean is like that, and now people can see a little of it.' },
  { id: 'ocean', from: 'nwosu', tier: 5, title: 'Open water', check: { t: 'archetype', id: 'open_ocean' }, reward: { coins: 6000, rep: 600 },
    text: 'The final gallery: open blue water and a river of silver fish. Make the city gasp.',
    met: 'Open blue water and a river of silver fish: the city gasped. The museum has nothing left to ask for. Almost.' },
  { id: 'codex_40', from: 'nwosu', tier: 5, title: 'Every kind of water', check: { t: 'codex', kind: 'archetypes', min: 40 }, reward: { coins: 6000, rep: 500 },
    text: 'The museum would like to publish a catalogue of every kind of aquarium a person can keep. Forty tank types recognized in your codex, and we can write it from your halls.',
    met: 'Forty tank types recognized in your codex: the museum can write its catalogue of aquaria from your halls alone.' },
  { id: 'reyes_species', from: 'reyes', tier: 5, title: 'A hundred and fifty', check: { t: 'codex', kind: 'species', min: 150 }, reward: { coins: 6000, rep: 500 },
    text: 'My notebooks have a hundred and fifty animals in them that I would like to see under one roof before I am too old for the bench. Your codex is getting close.',
    met: 'A hundred and fifty animals in your codex: everything in my notebooks, under one roof. I did not think I would see it.' },
  { id: 'school_50', from: 'okafor', tier: 5, title: 'FIFTY', check: { t: 'school', size: 50 }, reward: { coins: 5000, rep: 400 },
    text: 'Room 4 is grown up now (Year 6!) and we are coming back for our last trip. Fifty fish in one school, please, so we can count to fifty one last time.',
    met: 'Fifty fish in one school! Room 4 counted to fifty one last time, all together.' },
  { id: 'wren_reserve', from: 'wren', tier: 5, title: 'Where the old fish live', check: { t: 'project', id: 'reserve', min: 1 }, reward: { coins: 5000, rep: 400 },
    text: 'Forty years at sea and I have watched the big fish get fewer every season. If the aquarium helps found a marine reserve, I will sail its edges for free.',
    met: 'I sailed the edges of the new marine reserve this week, for free as I promised myself I would. Forty years I watched the big fish get fewer. Not in there.' },
];

/** Animal partnerships; b is a species id, 'item:<id>' for a host coral, or 'kind:<kind>'. */
export const SYMBIOSES: SymbiosisDef[] = [
  { id: 'clown_btn', a: 'ocellaris_clownfish', b: 'item:bubble_tip_anemone', name: 'Clownfish & Anemone',
    text: 'Mutualism: the clownfish is protected by the anemone\'s stings; the anemone gets scraps, cleaning and defense.' },
  { id: 'clown_carpet', a: 'ocellaris_clownfish', b: 'item:carpet_anemone', name: 'Clownfish & Carpet Anemone',
    text: 'A big carpet anemone can host a whole family of clownfish.' },
  { id: 'goby_pistol', a: 'yellow_watchman_goby', b: 'pistol_shrimp', name: 'Goby & Pistol Shrimp',
    text: 'Mutualism: the nearly blind shrimp digs and maintains the burrow; the goby stands guard and warns with a flick of its tail.' },
  { id: 'bitterling_mussel', a: 'bitterling', b: 'swan_mussel', name: 'Bitterling & Mussel',
    text: 'The bitterling lays its eggs inside the living mussel, where the fry grow up safe. It is more lodger than partner: the mussel gets little in return.' },
  { id: 'cleaner_station', a: 'cleaner_shrimp', b: 'kind:fish', name: 'Cleaning Station',
    text: 'Mutualism: fish get parasites removed; the shrimp gets a meal. Even predators wait their turn.' },
  { id: 'neon_goby_station', a: 'neon_goby', b: 'kind:fish', name: 'Goby Cleaning Station',
    text: 'Neon gobies run cleaning stations on coral heads in the Caribbean.' },
  { id: 'sexy_anemone', a: 'sexy_shrimp', b: 'item:bubble_tip_anemone', name: 'Sexy Shrimp & Anemone',
    text: 'Commensalism: the tiny shrimp lives safely among the anemone\'s tentacles.' },
  { id: 'cuckoo', a: 'cuckoo_catfish', b: 'tag:mouthbrooder', name: 'Cuckoo Catfish & Mouthbrooders',
    text: 'Brood parasitism: the catfish tricks mouthbrooding cichlids into raising its young.' },
  { id: 'urchin_sheephead', a: 'california_sheephead', b: 'purple_urchin', name: 'Sheephead & Urchin',
    text: 'Predator and prey keeping a kelp forest in balance: sheephead eat urchins, so urchins never strip the kelp.' },
];
