// Conservation and breeding projects: the aquarium's coins at work outside its walls. Each can be
// funded again and again for more each time; every funding earns reputation and a line from the
// people running it, and, up to a point, brings a few more visitors (a town proud of its
// aquarium). Some bring a species home: the axolotl refuge's captive-bred axolotls.
import { correspondent, species } from '../data';
import { PROJECTS } from '../data/progression';
import type { ProjectDef } from '../data/types';
import { BAL } from './balance';
import type { Game } from './Game';
import type { GameState } from './state';

export function project(id: string): ProjectDef {
  const p = PROJECTS.find((q) => q.id === id);
  if (!p) throw new Error(`unknown project: ${id}`);
  return p;
}

/** times this project has been funded */
export function funded(s: GameState, id: string): number {
  return s.projects?.[id] ?? 0;
}

/** what the next funding costs (each one a little more than the last) */
export function projectCost(s: GameState, p: ProjectDef): number {
  return Math.round((p.cost * Math.pow(BAL.projectCostGrowth, funded(s, p.id))) / 50) * 50;
}

/** the reputation the next funding earns */
export function projectRep(s: GameState, p: ProjectDef): number {
  return Math.round(p.rep * Math.pow(BAL.projectRepGrowth, funded(s, p.id)));
}

/** the line from the people running it after the n-th funding (the last one repeats) */
export function projectLine(p: ProjectDef, n: number): string {
  return p.lines[Math.max(0, Math.min(n, p.lines.length) - 1)];
}

/** the share more visitors every display tank draws, from every project funded so far */
export function projectVisitors(s: GameState): number {
  return PROJECTS.reduce((a, p) => a + (p.effect.visitors ?? 0) * Math.min(BAL.projectVisitorCap, funded(s, p.id)), 0);
}

export function canFund(s: GameState, p: ProjectDef): string | null {
  if (p.tier > s.tier) return 'Opens at a later tier.';
  if (s.coins < projectCost(s, p)) return 'Not enough coins.';
  return null;
}

export function fundProject(g: Game, id: string): string {
  const s = g.state;
  const p = project(id);
  const why = canFund(s, p);
  if (why) {
    g.emit({ t: 'sfx', name: 'error' });
    return why;
  }
  const rep = projectRep(s, p);
  s.coins -= projectCost(s, p);
  s.projects = { ...(s.projects ?? {}), [id]: funded(s, id) + 1 };
  s.rep += rep;
  let extra = '';
  const sp = p.effect.unlock;
  if (sp && !s.unlocked.species.includes(sp)) {
    s.unlocked.species.push(sp);
    extra = ` ${species(sp).name}: now on the supplier's list.`;
  }
  g.emit({ t: 'sfx', name: 'chime' });
  g.toast(`${correspondent(p.from).name}: ${projectLine(p, funded(s, id))} (+${rep} reputation)${extra}`, 'good');
  g.refreshAll(false);
  return '';
}
