// Progression: the shop's tiers (reputation), upgrade tracks, the correspondents who write
// letters, their requests, and animal partnerships. The story: you take over Ida Fenwick's
// closed-down fish shop and grow it, tank by tank, into the town's aquarium. Correspondents are
// known by their stationery and their handwriting; Ida also appears in the cutscenes.
import type { CorrespondentDef, RequestDef, SymbiosisDef, TierDef, UpgradeDef } from './types';

export const TIERS: TierDef[] = [
  { level: 0, name: 'Little Fish Shop', rep: 0, bays: 1, racks: 1, unlocks: 'One display bay in the front window, freshwater, the supplier\'s starter list.' },
  { level: 1, name: 'Neighborhood Fish Shop', rep: 80, bays: 2, racks: 2, unlocks: 'A second display bay, CO2, bigger tanks, paludariums and ripariums, the first expeditions.' },
  { level: 2, name: 'Aquarium Store', rep: 300, bays: 3, racks: 3, unlocks: 'Brackish water, chillers, mangroves and coldwater specialists.' },
  { level: 3, name: 'Town Aquarium', rep: 900, bays: 5, racks: 4, unlocks: 'The shop becomes a public aquarium: saltwater and reefs, koi ponds and touch pools.' },
  { level: 4, name: 'Regional Aquarium', rep: 2400, bays: 7, racks: 6, unlocks: 'Kreisels, kelp towers, SPS reefs and big sharks.' },
  { level: 5, name: 'Grand Oceanarium', rep: 6000, bays: 10, racks: 8, unlocks: 'The ocean window and the deep chamber.' },
];

export const UPGRADES: UpgradeDef[] = [
  // tanks
  { id: 'extra_bays', track: 'tanks', name: 'Extra Bays', levels: [
    { cost: 300, tier: 1, text: '+1 tank bay.' }, { cost: 1200, tier: 2, text: '+1 more bay.' }, { cost: 4000, tier: 3, text: '+1 more bay.' }] },
  { id: 'quarantine', track: 'tanks', name: 'Quarantine & Plant Dip', levels: [
    { cost: 150, tier: 0, text: 'New plants and rock are dipped: no hitchhiking pest snails or Aiptasia.' }] },
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
  // visitors
  { id: 'benches', track: 'visitors', name: 'Viewing Benches', levels: [
    { cost: 100, tier: 0, text: 'Visitors linger longer: +15% income.' }, { cost: 500, tier: 2, text: '+15% more.' }, { cost: 2000, tier: 4, text: '+15% more.' }] },
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
  // decor
  { id: 'set_galleon', track: 'decor', name: 'Galleon Set', levels: [{ cost: 120, tier: 0, text: 'Unlocks the sunken galleon; whimsy tanks with the full set draw more children.' }] },
  { id: 'set_ruins', track: 'decor', name: 'Lost City Set', levels: [{ cost: 160, tier: 1, text: 'Columns and amphorae; full sets add appeal.' }] },
  { id: 'set_zen', track: 'decor', name: 'Zen Garden Set', levels: [{ cost: 160, tier: 1, text: 'Lantern and bridge; boosts coldwater and pond tanks.' }] },
  { id: 'set_toybox', track: 'decor', name: 'Toybox Set', levels: [{ cost: 80, tier: 0, text: 'Castle and bubbling clam; children adore them.' }] },
  // husbandry
  { id: 'breeding_nets', track: 'husbandry', name: 'Breeder Boxes', levels: [
    { cost: 150, tier: 0, text: 'More fry survive to adulthood.' }, { cost: 600, tier: 2, text: 'Many more.' }] },
  { id: 'selective_breeding', track: 'husbandry', name: 'Selective Breeding', levels: [
    { cost: 250, tier: 1, text: 'Neocaridina colonies improve their color grade over generations.' }] },
  { id: 'fry_club', track: 'husbandry', name: 'Hobbyist Club', levels: [
    { cost: 200, tier: 1, text: 'Surplus fry and frags go to local hobbyists for coins.' }] },
  { id: 'fragging', track: 'husbandry', name: 'Coral Fragging', levels: [
    { cost: 400, tier: 3, text: 'Overgrown corals can be fragged into new colonies.' }] },
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

export const REQUESTS: RequestDef[] = [
  // tier 0: Ida's letters come first, then the town finds the shop
  { id: 'ida_window', from: 'ida', tier: 0, first: true, title: 'The window tank', check: { t: 'rating', stars: 3 }, reward: { coins: 60, rep: 10 },
    text: 'Folk judge a fish shop by its window. Get that first tank to three stars, healthy fish and clean glass, and they will start coming in out of the rain.' },
  { id: 'ida_plants', from: 'ida', tier: 0, first: true, title: 'Living plants', check: { t: 'plant_species', min: 2 }, reward: { coins: 40, rep: 6 },
    text: 'Plastic plants never sold a single fish. Two kinds of real plants, please: they eat the ammonia before your fish ever notice it.' },
  { id: 'first_school', from: 'okafor', tier: 0, title: 'Can they swim together?', check: { t: 'school', size: 8 }, reward: { coins: 60, rep: 10 },
    text: 'Dear Aquarium, we read that some fish swim in a big group called a SCHOOL. Can you make one? We will count them on Friday.' },
  { id: 'three_plants', from: 'driftwood', tier: 0, title: 'A proper planted tank', check: { t: 'plant_species', min: 3 }, reward: { coins: 50, rep: 8 },
    text: 'We would love to see at least three kinds of plants growing in one of your tanks. Plants are half of every aquarium.' },
  { id: 'glow', from: 'junie', tier: 0, title: 'something that GLOWS', check: { t: 'tag', tag: 'glow', min: 3 }, reward: { coins: 60, rep: 10 },
    text: 'can you get fish that glow like a night lite. 3 of them please. (I drew one)' },
  { id: 'cherries', from: 'pip', tier: 0, title: 'A cherry shrimp colony', check: { t: 'species', id: 'cherry_shrimp', min: 10 }, reward: { coins: 70, rep: 12 },
    text: 'Nothing calms me like a swarm of cherry shrimp grazing on moss. Ten would be a start; they will make the rest themselves.' },
  { id: 'assassins', from: 'pip', tier: 0, when: 'pests', title: 'The snail situation', check: { t: 'pests_clear' }, reward: { coins: 90, rep: 15, unlock: 'quarantine' },
    text: 'I noticed little pest snails in your tanks, riding in on new plants. Assassin snails will tidy them up without chemicals. Clear one tank of pests and I will tell you my dipping secret.' },
  { id: 'two_stars', from: 'reyes', tier: 0, title: 'A tank worth sitting by', check: { t: 'rating', stars: 4 }, reward: { coins: 80, rep: 12 },
    text: 'I sit here most Tuesdays. Tidy up that front window until it earns four stars and I will bring my old field notebooks to share.' },
  { id: 'bottom', from: 'okafor', tier: 0, title: 'Who lives on the bottom?', check: { t: 'tag', tag: 'scavenger', min: 4 }, reward: { coins: 60, rep: 10 },
    text: 'Amara says some fish live on the floor of the tank and clean up. We want to see four of them doing it.' },
  { id: 'betta', from: 'junie', tier: 0, title: 'a fancy fighting fish', check: { t: 'archetype', id: 'betta_haven' }, reward: { coins: 70, rep: 12 },
    text: 'my cousin has a betta in a little cup. can you show how a betta SHOULD live. with plants.' },
  // tier 1
  { id: 'iwagumi', from: 'driftwood', tier: 1, title: 'Stones and grass', check: { t: 'archetype', id: 'iwagumi' }, reward: { coins: 200, rep: 30, unlock: 'frodo_stone' },
    text: 'Our club challenge this season is Iwagumi: odd stones, one carpet, one school. Show us yours.' },
  { id: 'dutch', from: 'driftwood', tier: 1, title: 'A Dutch garden', check: { t: 'archetype', id: 'dutch' }, reward: { coins: 220, rep: 30 },
    text: 'Our oldest member learned scaping in Holland. Plant streets, contrast, no wood. Will you try?' },
  { id: 'blackwater', from: 'nwosu', tier: 1, title: 'The black river', check: { t: 'archetype', id: 'rio_negro' }, reward: { coins: 240, rep: 35 },
    text: 'The museum is opening an Amazon gallery. A true Rio Negro blackwater biotope next door would complete it.' },
  { id: 'africa', from: 'nwosu', tier: 1, title: 'From African waters', check: { t: 'region_tank', continent: 'Africa' }, reward: { coins: 200, rep: 30 },
    text: 'Africa has three great lakes and rainforest streams full of fishes found nowhere else. One biotope from that continent, please.' },
  { id: 'fry', from: 'okafor', tier: 1, title: 'BABY FISH', check: { t: 'fry' }, reward: { coins: 150, rep: 25 },
    text: 'We are learning about life cycles. Did any of your fish have babies? Please say yes.' },
  { id: 'three_stars', from: 'reyes', tier: 1, title: 'Four and a half stars', check: { t: 'rating', stars: 4.5 }, reward: { coins: 200, rep: 30 },
    text: 'Healthy animals, clean water, a scape with an idea behind it. Four and a half stars, and I will tell you about the reefs I dived in 1979.' },
  { id: 'big_fish', from: 'junie', tier: 1, title: 'a BIG fish', check: { t: 'big_fish', cm: 15 }, reward: { coins: 120, rep: 20 },
    text: 'bigger than my hand please' },
  { id: 'no_fish', from: 'driftwood', tier: 1, title: 'Plants alone', check: { t: 'no_fish' }, reward: { coins: 160, rep: 25 },
    text: 'A dare: a tank with no fish at all, rated two stars on its plants and stones alone.' },
  { id: 'night', from: 'abe', tier: 1, title: 'After closing', check: { t: 'night' }, reward: { coins: 150, rep: 25 },
    text: 'When the lights go down, some of your fish wake up. A tank with a moonlight and a few night creatures would keep me company.' },
  { id: 'galleon', from: 'junie', tier: 1, title: 'PIRATES', check: { t: 'decor_set', tag: 'set_galleon' }, reward: { coins: 120, rep: 20 },
    text: 'a ship and a treasure chest that bubbles. PLEASE.' },
  { id: 'goldfish', from: 'tomas', tier: 1, title: 'Goldfish done right', check: { t: 'archetype', id: 'goldfish' }, reward: { coins: 160, rep: 25 },
    text: 'Everyone has kept a goldfish in a bowl, and everyone did it wrong. Show them a proper goldfish tank.' },
  { id: 'paludarium', from: 'nwosu', tier: 1, title: 'Land and water', check: { t: 'archetype', id: 'paludarium' }, reward: { coins: 220, rep: 30 },
    text: 'Our wetlands exhibit needs a living counterpart: a paludarium where the water meets the bank.' },
  // tier 2
  { id: 'axolotl', from: 'okafor', tier: 2, title: 'The smiling one', check: { t: 'species', id: 'axolotl', min: 1 }, reward: { coins: 300, rep: 40 },
    text: 'We voted and the class animal is the AXOLOTL. Do you have one? They regrow their legs!' },
  { id: 'mangrove', from: 'reyes', tier: 2, title: 'Where rivers meet the sea', check: { t: 'archetype', id: 'mangrove' }, reward: { coins: 400, rep: 50 },
    text: 'Mangroves are nurseries for half the sea. A brackish estuary tank would teach more than any lecture of mine.' },
  { id: 'symbiosis', from: 'reyes', tier: 2, title: 'Partners', check: { t: 'symbiosis' }, reward: { coins: 300, rep: 40 },
    text: 'Show your visitors two animals that depend on each other. Nature is mostly partnerships.' },
  { id: 'four_stars', from: 'nwosu', tier: 2, title: 'Exhibition quality', check: { t: 'rating', stars: 5 }, reward: { coins: 400, rep: 50 },
    text: 'A five-star tank and the museum will list your aquarium in its visitor guide.' },
  { id: 'crystal', from: 'pip', tier: 2, title: 'Crystal clear', check: { t: 'archetype', id: 'caridina' }, reward: { coins: 300, rep: 45 },
    text: 'Crystal reds are the hardest shrimp I know: soft water, active soil, cool and steady. Prove me wrong.' },
  // tier 3
  { id: 'reef', from: 'reyes', tier: 3, title: 'A living reef', check: { t: 'corals', min: 5 }, reward: { coins: 500, rep: 60 },
    text: 'Five corals growing in your care. It is how every reefer starts, and how the reefs of my youth looked from a boat.' },
  { id: 'seahorse', from: 'junie', tier: 3, title: 'sea horses', check: { t: 'archetype', id: 'seahorse' }, reward: { coins: 600, rep: 70 },
    text: 'the dad seahorses have the babies. I want to see them. I drew a seahorse but it looks like a 5' },
  { id: 'koi', from: 'tomas', tier: 3, title: 'A proper pond', check: { t: 'archetype', id: 'koi_pond' }, reward: { coins: 700, rep: 80 },
    text: 'I kept koi for forty years. Build a pond worthy of them and I will tell you all their names.' },
  { id: 'touch', from: 'okafor', tier: 3, title: 'Can we touch?', check: { t: 'archetype', id: 'touch_pool' }, reward: { coins: 700, rep: 80 },
    text: 'Our field trip is next month. Is there anywhere we can (gently!) touch a starfish?' },
  // tier 4+
  { id: 'jellies', from: 'abe', tier: 4, title: 'Lanterns', check: { t: 'archetype', id: 'jelly_kreisel' }, reward: { coins: 1200, rep: 120 },
    text: 'I once saw jellies in a round tank with a blue light behind them. I would sit with that every night.' },
  { id: 'kelp', from: 'reyes', tier: 4, title: 'The forest under the sea', check: { t: 'archetype', id: 'kelp_forest' }, reward: { coins: 1500, rep: 150 },
    text: 'A kelp forest indoors: cold water, surge and light. It is the most ambitious tank there is. Almost.' },
  { id: 'five_stars', from: 'nwosu', tier: 4, title: 'A perfect reef', check: { t: 'water', is: 'marine', stars: 5 }, reward: { coins: 1500, rep: 150 },
    text: 'A five-star saltwater tank. The museum would like to commission a plaque.' },
  { id: 'deep', from: 'reyes', tier: 5, title: 'The midnight zone', check: { t: 'archetype', id: 'deep_sea' }, reward: { coins: 3000, rep: 300 },
    text: 'Most of the ocean is dark and cold, and almost nobody ever sees it. Let them see a little.' },
  { id: 'ocean', from: 'nwosu', tier: 5, title: 'Open water', check: { t: 'archetype', id: 'open_ocean' }, reward: { coins: 3000, rep: 300 },
    text: 'The final gallery: open blue water and a river of silver fish. Make the city gasp.' },
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
