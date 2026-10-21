// Every tuning number in one place, so balancing (PLAN.md, M11) is edits here, not hunts.

export const BAL = {
  /** the hall's air temperature; tanks drift toward it without a heater or chiller */
  roomTemp: 22,
  /** degrees a heater can lift the water per watt per liter */
  heatPerWattPerL: 6,
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

  /** visitors per open hour for a perfect tank, by aquarium tier */
  visitorsByTier: [20, 34, 55, 85, 130, 200],
  openHour: 9,
  closeHour: 19,
  nightClose: 23,
  coinsPerVisitor: 1.0,
  repPerVisitor: 0.06,
  repNewArchetype: 12,
  repNewSpecies: 2,
  /** offline income: Ida minds the counter while you are away. Each real hour away (up to the cap)
   *  earns this share of what the displays make in an open hour; the tanks themselves wait. */
  offlineShare: 0.5,
  offlineCapHours: 8,

  /** fry take this many days to grow up */
  growDays: 4,
  /** chance per plant bought (without quarantine) of hitchhiking pest snails */
  hitchhikeChance: 0.3,

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

export function bioloadOf(cm: number, body?: string): number {
  // waste follows body mass: an eel-thin kuhli loach makes far less than a deep-bodied cichlid
  const shape = body && THIN.has(body) ? 0.4 : body && DEEP.has(body) ? 1.25 : 1;
  return Math.pow(cm / 5, BAL.bioExp) * shape;
}

const THIN = new Set(['eel', 'loach', 'slender', 'knife', 'pipefish', 'seahorse', 'shrimp', 'gardeneel']);
const DEEP = new Set(['deep', 'disc', 'koi', 'fancy', 'puffer', 'arowana']);
