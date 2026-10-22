// Every tuning number in one place, so balancing (PLAN.md, M11) is edits here, not hunts.

export const BAL = {
  /** the hall's air temperature; tanks drift toward it without a heater or chiller */
  roomTemp: 22,
  /** degrees above the room a heater holds a tank of its rated size (more in a smaller tank, less
   *  in a bigger one): at 22 C in the hall, a heater on the right size of tank reaches 27 C */
  heatLift: 5,
  /** liters in a US gallon (heaters are rated in gallons) */
  galL: 3.785,
  chillPerWattPerL: 8,
  /** fraction of the way temperature moves toward its target per hour */
  tempRate: 0.35,

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

  /** a "full load" of hardscape is this much item area (px) per 100 L */
  fxArea: 1400,

  /** visitors per open hour that a perfect 20 gallon long draws; bigger water draws more (see
   *  sizeFactor), and a bigger name brings a bigger town (townByTier) */
  visitorsPerTank: 14,
  townByTier: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
  openHour: 9,
  closeHour: 19,
  nightClose: 23,
  coinsPerVisitor: 1.0,
  repPerVisitor: 0.06,
  repNewArchetype: 10,
  repNewSpecies: 1,
  /** offline income: Ida minds the counter while you are away. Each real hour away (up to the cap)
   *  earns this share of what the displays make in an open hour; the tanks themselves wait. */
  offlineShare: 0.5,
  offlineCapHours: 8,

  /** fry take this many days to grow up */
  growDays: 4,
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

  waterChangeCostPerL: 0.01,
  saltCostPerL: 0.03,
  sellBack: 0.5,
  /** shop sales: customers per open hour with no displays at all, plus this share of everyone the displays draw in */
  shopperBase: 1.2,
  shopperShare: 0.18,
  /** retail price over what the supplier charges you */
  retailMarkup: 1.7,
  /** a stock tank keeps this many of each species back as breeders unless told otherwise */
  keepDefault: 2,
  /** cuttings and frags sell at this share of the plant's shop price */
  cuttingShare: 0.8,
  /** first stock-rack bay number (display bays count up from 0) */
  rackBay: 100,
  startCoins: 400,
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
  // waste follows body mass: an eel-thin kuhli loach makes far less than a deep-bodied cichlid
  const shape = body && THIN.has(body) ? 0.4 : body && DEEP.has(body) ? 1.25 : 1;
  return Math.pow(cm / 5, BAL.bioExp) * shape;
}

const THIN = new Set(['eel', 'loach', 'slender', 'knife', 'pipefish', 'seahorse', 'shrimp', 'gardeneel']);
const DEEP = new Set(['deep', 'disc', 'koi', 'fancy', 'puffer', 'arowana']);
