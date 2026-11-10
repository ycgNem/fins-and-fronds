// Every tuning number in one place, so balancing (PLAN.md, M11) is edits here, not hunts.

export const BAL = {
  /** the hall's air temperature; tanks drift toward it without a heater or chiller */
  roomTemp: 22,
  /** degrees above the room a heater holds a tank of its rated size (more in a smaller tank, less
   *  in a bigger one): at 22 C in the hall, a heater on the right size of tank reaches 27 C */
  heatLift: 5,
  /** liters in a US gallon (heaters are rated in gallons) */
  galL: 3.785,
  /** degrees below the room a chiller holds a tank of its rated size (more in a smaller tank, less
   *  in a bigger one), so a chiller on the right size of tank reaches 14 C in a 22 C hall */
  chillDrop: 8,
  /** fraction of the way temperature moves toward its target per hour */
  tempRate: 0.35,
  /** a reading this close to a rule's or a species' limit counts as on it (the display shows 0.1 C) */
  tempTol: 0.05,

  /** calcite saturates in open water at about this pH: dissolving rock and carbonate sand lift the
   *  pH this far and no further (a buffer holds a floor, it does not keep adding) */
  calcitePh: 8.3,
  /** active soil buffers pH down to about this and no lower (it cannot sour already acid water) */
  soilPh: 6.2,
  /** salinity with no top-off stops climbing here (salt crusts the rim instead) */
  sgMax: 1.04,
  /** nitrate stops climbing here (ppm): past it every animal is already in trouble */
  no3Max: 400,
  /** new wood leaches half as much tannin after this many days in the water, down to a floor:
   *  the lasting tint of soaked wood (a Rio Negro tank of heavy tannin wood stays stained) */
  woodTanninHalfLife: 7,
  woodTanninFloor: 0.4,
  /** leaf litter and cones stain this much more than their outline on the floor suggests: they
   *  steep across the bottom, and keepers top them up as they break down */
  leafStain: 10,
  /** ...but one patch weighs at most this much, however small the tank: a handful of catappa
   *  tints a nano amber (activated carbon still clears it), and blackwater takes a bed of leaves,
   *  tannin-rich wood, peat or blackwater */
  leafStainMax: 0.8,
  /** tannin levels where fresh water looks amber, then blackwater */
  tanninAmber: 0.2,
  tanninBlack: 0.3,

  /** bioload units per animal: (cm / 5) ^ 2.2 */
  bioExp: 2.2,
  /** ammonia (ppm per hour) from one bioload unit in one liter */
  wastePerBio: 0.4,
  /** bioload units one liter of filter "bio" rating supports */
  bioPerFilterL: 0.2,
  /** bacteria logistic growth per hour (ammonia eaters, nitrite eaters) */
  // a fishless cycle takes about three weeks (RESEARCH.md: two to six); seeded media skips it
  bacGrowA: 0.017,
  bacGrowB: 0.014,
  /** per hour, so an unfed filter loses about a third of its bacteria in two weeks */
  bacStarve: 0.0012,
  /** total ammonia never climbs past this (ppm) */
  nh3Max: 30,
  /** most of the colony lives in the filter: when the last one comes out, this share is left on
   *  the glass, gravel and wood */
  bacNoFilter: 0.25,

  /** a "full load" of hardscape is this much item area (px) per 100 L */
  fxArea: 1400,
  /** a piece's center stays this share of its width in from the glass: a big root may run a little
   *  past the end of the tank, as real ones do, but never sits half outside it */
  edgeRoom: 0.4,

  /** visitors per open hour that a perfect 20 gallon long draws; bigger water draws more (see
   *  sizeFactor), and a bigger name brings a bigger town (townByTier) */
  visitorsPerTank: 14,
  townByTier: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
  openHour: 9,
  closeHour: 19,
  nightClose: 23,
  coinsPerVisitor: 1.0,
  repPerVisitor: 0.05,
  /** a newly recognized tank type: this much, plus repArchetypePerTier for each tier it opens at,
   *  times its visitor appeal (a goldfish tank 7, a koi pond 45, open ocean 78) */
  repNewArchetype: 6,
  repArchetypePerTier: 8,
  repNewSpecies: 1,
  /** a partnership seen for the first time */
  repNewPartnership: 15,
  /** a codex plaque for every tank type in a family: this much reputation per type in it */
  familyPlaqueRep: 15,
  /** a species the crew brings home before you have ever kept it: this much per tier of it (at least one) */
  repFirstCatch: 4,
  /** offline income: Ida minds the counter while you are away. Each real hour away (up to the cap)
   *  earns this share of what the displays make in an open hour; the tanks themselves wait. */
  offlineShare: 0.5,
  offlineCapHours: 8,
  /** ...and the guestbook fills a little: this share of an open hour's reputation per hour away */
  offlineRepShare: 0.25,

  /** conservation projects: each funding costs this much more than the last, and earns this much
   *  more reputation (so coins per reputation creep up: a sink that never runs dry, gently) */
  projectCostGrowth: 1.5,
  projectRepGrowth: 1.3,
  /** a project's visitor bonus stops growing after this many fundings */
  projectVisitorCap: 3,

  /** an expedition's catch sells for about this share of the trip's cost (more with Better Nets) */
  tripReturn: 1.1,
  netsReturn: 0.1,
  /** each recent trip to a region takes this share off the next catch there (overfished)... */
  overfished: 0.2,
  /** ...down to this share at most; a region recovers fishedRecover trips' worth a game day (a
   *  trip every other day keeps it fresh) */
  fishedFloor: 0.3,
  fishedRecover: 0.5,

  /** the cleaning crew wipes (level 1) and scrapes (level 2) any tank past this much, at this hour */
  crewThreshold: 0.25,
  crewHour: 8.5,
  /** for the first few days, closing time says how to sleep through the night */
  sleepHintDays: 3,

  /** a tank holding a whole decor set draws this much more; more in the kind of tank it suits */
  setBonus: { any: 0.06, fit: 0.15 },
  /** the museum's visitor guide (Nwosu's reply) sends this much more to every display */
  guideVisitors: 0.05,

  /** the week (src/sim/week.ts): Friday's school trip draws more to tanks with spectacle and spends
   *  little; Saturday's market brings crowds and shoppers; on Tuesday (Dr. Reyes's bench) word of
   *  mouth follows wellbeing, on Sunday (the Driftwood Club's judging) it follows the scape */
  /** Friday visitors per tank: base + spectacle (0..1) times this; coins and reputation per visitor */
  schoolTrip: { base: 0.8, spectacle: 0.7, coins: 0.6, rep: 1.3 },
  market: { visitors: 1.3, shoppers: 1.6 },
  /** reputation per visitor on Tuesday and Sunday: base + this much times the part (0..1) */
  judgedRep: { base: 0.6, part: 0.8 },
  /** the Sunday rosette at four for the best scape (scoring at least rosetteMinScape): coins and
   *  reputation by tier */
  judgingHour: 16,
  rosetteMinScape: 50,
  /** the club judges a scape (the rosette, the season's trophy) only with this many stones,
   *  roots, plants or corals in it: open water scores well, but it is not a scape */
  judgedPieces: 4,
  rosetteCoins: [20, 60, 150, 300, 500, 800],
  rosetteRep: [3, 8, 20, 40, 70, 100],

  /** fry take this many days to grow up */
  growDays: 4,
  /** crowding by the old rule of thumb, centimeters of animal per liter: past crowdCm the fish feel
   *  it (the report card warns at the same point, src/sim/rating.ts). A brood only comes while the
   *  tank has room for it grown up: under breedCm, and the adults' waste under breedLoad x the
   *  filter's capacity */
  crowdCm: 1.3,
  breedCm: 1.2,
  breedLoad: 1.0,
  /** shrimp, snails, crabs and other crawlers count this share of their length (keepers put ten
   *  cherry shrimp in a gallon, but a fish of the same length in each) */
  crawlerRoom: 0.3,
  /** past this many animals in one tank no brood survives: the young are lost in the crowd */
  breedCrowd: 150,
  /** share of fry and shrimplets that escape the intake of a filter that is not gentle (a sponge
   *  filter or a kreisel loop cannot suck them in) */
  intakeSurvival: 0.5,
  /** hours after a feeding before the fish want the next one, and when they are truly hungry: once
   *  a day is fine, twice a day is best */
  peckishH: 16,
  hungryH: 48,
  /** plant eaters (silver dollars, goldfish, urchins) take this much off a soft plant's vigor per
   *  10 cm of them, shared among the soft plants; each reef-risk fish (angels, triggers) this much
   *  off a fleshy coral's; never more than biteMax */
  plantBite: 0.15,
  coralNip: 0.15,
  biteMax: 0.6,
  /** chance per plant bought (without quarantine) of hitchhiking pest snails */
  hitchhikeChance: 0.12,

  /** running costs per game day: power and water for a 20 gallon long (scaled by sizeFactor ^ 1.3),
   *  gear wear as a share of its price, and food per animal (src/sim/upkeep.ts) */
  upkeepWater: { fresh: 4.5, brackish: 7, marine: 12 },
  upkeepGear: 0.04,
  upkeepFood: 0.15,
  /** wild-caught animals from an expedition sell for this share of the supplier price (collectors pay well) */
  wildPremium: 1.2,
  /** game minutes between letters: Ida's first notes, then with none open, then with some open */
  letterGapFirst: 20,
  letterGapIdle: 240,
  letterGapBusy: 480,
  /** a letter left unanswered this many days goes back in the pile (it may come again later) */
  letterPatienceDays: 6,
  /** share of letters that may be a thank-you for something the shop already does (one at a time) */
  letterMetShare: 0.4,
  /** a reply in a correspondent's story comes at least this long (game minutes) after your answer */
  replyDelay: 1440,

  waterChangeCostPerL: 0.01,
  /** substrate: floor area (cm2) per list price, and at most this share of the tank's price */
  substrateArea: 1800,
  substrateCap: 0.4,
  saltCostPerL: 0.03,
  sellBack: 0.5,
  /** shop sales: customers per open hour with no displays at all, plus this share of everyone the displays draw in */
  shopperBase: 1.2,
  shopperShare: 0.18,
  /** retail price over what the supplier charges you */
  retailMarkup: 1.7,
  /** a Neocaridina sells for this much more per color grade (0 pale .. 3 solid); a captive-bred
   *  saltwater fish for this much more, and each one sold earns a little reputation */
  gradePrice: 0.5,
  captiveBredPrice: 1.5,
  captiveBredRep: 0.5,
  /** a stock tank keeps this many of each species back as breeders unless told otherwise, and
   *  never fewer than a breeding group: the species' school size (at most keepGroupMax), or a pair */
  keepDefault: 2,
  keepGroupMax: 10,
  /** cuttings and frags sell at this share of the plant's shop price */
  cuttingShare: 0.8,
  /** first stock-rack bay number (display bays count up from 0) */
  rackBay: 100,

  /** the interface (src/ui): a "Sure?" button stays armed this many seconds, and a scape change
   *  shows what it did to the Scape part this long */
  confirmSecs: 4,
  scapeDeltaSecs: 3,
  /** a tank's Wellbeing part falling this many points below its recent level warns (at most once
   *  every warnGapMin game minutes); the recent level lets go of the past over about dropWindowMin */
  wellbeingDrop: 12,
  dropWindowMin: 180,
  warnGapMin: 360,
  /** the hall's attention badges: a species this unhappy, ammonia or nitrite this high (ppm),
   *  glass this green */
  attention: { mood: 0.45, toxin: 0.25, glass: 0.4 },
  startCoins: 400,
  /** offline income under this many coins comes in quietly, without a toast */
  offlineToastMin: 10,
  /** feeding again within this many game minutes is overfeeding: the leftovers rot into ammonia */
  overfeedMin: 240,
} as const;

/** how much more a tank of this size draws (and costs) than a 20 gallon long: steady growth up to
 *  300 L, slower to 3000 L, and slowest beyond, so a 200,000 L ocean window is a flagship that
 *  draws five times a 20 gallon, not two hundred tanks' worth */
export function sizeFactor(liters: number): number {
  const l = Math.max(1, liters);
  if (l <= 300) return Math.pow(l / 76, 0.45);
  const at300 = Math.pow(300 / 76, 0.45);
  if (l <= 3000) return at300 * Math.pow(l / 300, 0.25);
  return at300 * Math.pow(10, 0.25) * Math.pow(l / 3000, 0.12);
}

export function bioloadOf(cm: number, body?: string): number {
  // waste follows body mass: an eel-thin kuhli loach makes far less than a deep-bodied cichlid,
  // a jelly is about 95% water, and most of a spider crab's span is leg
  const shape = body === 'jelly' ? 0.1 : body === 'spidercrab' ? 0.12 : body && THIN.has(body) ? 0.4 : body && DEEP.has(body) ? 1.25 : 1;
  return Math.pow(cm / 5, BAL.bioExp) * shape;
}

const THIN = new Set(['eel', 'loach', 'slender', 'knife', 'pipefish', 'seahorse', 'shrimp', 'gardeneel']);
const DEEP = new Set(['deep', 'disc', 'koi', 'fancy', 'puffer', 'arowana']);
