// Guestbook lines. Visitors are never drawn: you meet them through what they write. {sp}, {n},
// {tank} and {type} are filled in by src/sim/visitors.ts.

export type GuestTrigger =
  | 'great' | 'good' | 'ok' | 'poor' | 'school' | 'new_species' | 'archetype' | 'glow' | 'big' | 'cloudy' | 'algae'
  | 'smudged' | 'fry' | 'empty' | 'jelly' | 'shark' | 'octopus' | 'whimsy' | 'night' | 'shrimp' | 'snail' | 'axolotl'
  | 'seahorse' | 'stressed' | 'cleaner' | 'pests' | 'planted' | 'tannin';

export const GUEST_LINES: Record<GuestTrigger, string[]> = {
  great: ['I could have stayed all afternoon by {tank}.', 'Best tank in town. Not even close.', 'We came for an hour and stayed three.', 'It felt like looking through a window into a real river.'],
  good: ['Lovely and calm. Thank you.', 'My little one waved at every fish.', 'Such healthy-looking fish!', 'A perfect rainy-day visit.'],
  ok: ['Nice tanks. Looking forward to what comes next.', 'Pleasant. Could use a few more fish.', 'Quiet and sweet.'],
  poor: ['The fish looked a little tired today.', 'Hope things are better next time.', 'Some of the tanks seemed unwell.'],
  school: ['We counted {n} {sp} swimming together!', 'The school of {sp} turned all at once, like a flock of birds.', 'Hypnotic. The {sp} never stopped moving.'],
  new_species: ['First time I have ever seen a {sp}!', 'The {sp} is new, isn\'t it? Wonderful.', 'I had to look up the {sp}. Amazing animal.'],
  archetype: ['A real {type}! Just like the books.', 'The {type} is a work of art.', 'I recognized the {type} from a documentary.'],
  glow: ['The glowing fish in the dark corner! My kids lost their minds.', 'How do they shine like that?'],
  big: ['That {sp} was looking right at me.', 'The {sp} is enormous. And I think it likes us.'],
  cloudy: ['The water in {tank} looked a bit milky.', 'A little foggy in one of the tanks today.'],
  algae: ['There was green on the glass of {tank}.', 'Some algae on the rocks, but the fish seemed fine.'],
  smudged: ['Sorry about the nose prints. That was us.', 'Lots of little fingerprints on {tank}. Good sign, I suppose.'],
  fry: ['BABY FISH. We saw the babies!', 'There were tiny fry hiding in the plants!'],
  empty: ['Can\'t wait to see what goes in the empty bay.', 'One tank is just water and stones for now. Intriguing.'],
  jelly: ['The jellies. I have no words. Just... the jellies.', 'Watched the jellies pulse for twenty minutes. Best meditation ever.'],
  shark: ['A SHARK! A real one!', 'The shark glided past so close to the glass.'],
  octopus: ['The octopus watched us back. It knew.', 'Did the octopus just open a jar?'],
  whimsy: ['The treasure chest bubbled and everyone cheered!', 'My son wants a castle for his room now.'],
  night: ['Came for the night opening. The fish we never see in the day!', 'Moonlight tanks are magic.'],
  shrimp: ['So many tiny shrimp! They never stop eating.', 'The red shrimp look like little cherries.'],
  snail: ['We watched a snail cross the whole glass. It took a while. Worth it.', 'An assassin snail! I did not know snails could hunt.'],
  axolotl: ['THE AXOLOTL SMILED AT ME.', 'Learned that axolotls can regrow legs. My mind is blown.'],
  seahorse: ['The seahorses hold hands with the grass!', 'Daddy seahorses have the babies. Today I learned.'],
  stressed: ['The {sp} looked pale. Hope it feels better.', 'One of the fish was hiding the whole time.'],
  cleaner: ['A little shrimp was cleaning a fish\'s mouth! It just let it!', 'The cleaning station was the best thing I saw today.'],
  pests: ['Lots of tiny snails on the glass of {tank}.', 'Are the little snails meant to be there?'],
  planted: ['The plants were so green they glowed.', 'That carpet of tiny plants! How?'],
  tannin: ['Why is the water brown? Oh, it\'s on purpose! Fascinating.', 'The tea-colored tank felt like a real jungle river.'],
};

export const GUEST_NAMES = [
  'Priya', 'Tom', 'Amara', 'Lucía', 'Kenji', 'Noor', 'Ollie', 'Sam', 'Mira', 'Theo', 'Hana', 'Jonah', 'Ines', 'Ravi', 'Freya', 'Kofi',
  'Elif', 'Mateo', 'Ada', 'Bea', 'Callum', 'Dina', 'Ezra', 'Fatima', 'Gus', 'Ivy', 'Jun', 'Leila', 'Milo', 'Nadia', 'Oscar', 'Rosa',
];

export const GUEST_PLACES = [
  'from across town', 'visiting from Larkfield', 'on a school trip', 'with Grandma', 'on our anniversary', 'on a rainy Saturday',
  'from the coast', 'after work', 'with the twins', 'first visit!', 'third visit this month', 'from the aquascaping club',
];
