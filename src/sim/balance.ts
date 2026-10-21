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
  bacGrowA: 0.12,
  bacGrowB: 0.09,
  bacStarve: 0.004,

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
  /** offline income: game hours credited per real hour away, and the cap in real hours */
  offlineGameHoursPerHour: 6,
  offlineCapHours: 8,

  /** fry take this many days to grow up */
  growDays: 4,
  /** chance per plant bought (without quarantine) of hitchhiking pest snails */
  hitchhikeChance: 0.3,

  waterChangeCostPerL: 0.01,
  saltCostPerL: 0.03,
  sellBack: 0.5,
  startCoins: 300,
} as const;

export function bioloadOf(cm: number): number {
  return Math.pow(cm / 5, BAL.bioExp);
}
