// data/plates.csv is git-ignored, so only builds made on a machine that has it include own plates.
const files = import.meta.glob<string>('../data/plates.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const OWN_PLATES_CSV: string = Object.values(files)[0] ?? '';
