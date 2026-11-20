/**
 * The "branches": the nevcan.com sites that are live, as in the hidden ~/.plan (keep the two in
 * step). `⎇ main` in the status bar lists them (BranchPicker.tsx), and so do `git branch` and
 * `git checkout` / `git switch` / `git co` in the terminal. Picking one opens that site in the same
 * tab; nothing here changes. `dev` is a joke: it's main by another name.
 */
export interface Branch {
  name: string;
  host: string;
  /** where checking it out goes; none: it's this site */
  url?: string;
  /** a short note in the list */
  note?: string;
}

export const CURRENT = 'main';

export const BRANCHES: Branch[] = [
  { name: 'main', host: 'dev.nevcan.com', note: "you're here" },
  { name: 'dev', host: 'dev.nevcan.com', note: '→ main' },
  { name: 'dive', host: 'dive.nevcan.com', url: 'https://dive.nevcan.com' },
  { name: 'fit', host: 'fit.nevcan.com', url: 'https://fit.nevcan.com', note: 'sign-in' },
  { name: 'www', host: 'www.nevcan.com', url: 'https://www.nevcan.com' },
];

export const branchByName = (name: string) => BRANCHES.find((b) => b.name === name);
