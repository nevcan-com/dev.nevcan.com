/**
 * The few facts the terminal prints on its own (whoami, neofetch, contact). Everything longer
 * lives in the Markdown files under src/fs/. Same sources as dive.nevcan.com's about.ts:
 * Nev's LinkedIn experience and nevcan.com.
 */
export const profile = {
  name: 'Nevcan Uludaş',
  headline: 'Front-end architect · co-founder & CTPO @ Dipnot',
  location: 'Istanbul',
  /** Türkiye has been on UTC+3 all year since 2016 */
  timezone: 'Istanbul, UTC+3 all year',
  since: 2006,
  current: 'Co-founder & CTPO @ Dipnot',
  languages: 'Turkish, English',
  email: 'dev@nevcan.com',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nevcanuludas' },
    { label: 'GitHub', href: 'https://github.com/nevcanuludas' },
  ],
};
