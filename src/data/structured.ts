/**
 * Structured data (JSON-LD) for the home page: this site, the page as Nev's profile, and Nev.
 *
 * Nev has one `@id` on every nevcan.com site (www, dive, dev), so search engines read them as
 * one person. www keeps the full account list; this site lists only the accounts that matter for
 * software and research. The accounts come from nev-docs/docs/identity.md.
 */
import { profile } from './profile';

export const PERSON_ID = 'https://www.nevcan.com/#person';
const SITE = 'https://dev.nevcan.com/';

const SAME_AS = [
  'https://www.linkedin.com/in/nevcanuludas',
  'https://github.com/nevcanuludas',
  'https://gitlab.com/nevcanuludas',
  'https://orcid.org/0009-0008-2027-4072',
  'https://scholar.google.com/citations?user=DzEc7TgAAAAJ',
];

export function homeLd(title: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}#website`,
        url: SITE,
        name: 'dev.nevcan.com',
        inLanguage: 'en',
        publisher: { '@id': PERSON_ID },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${SITE}#profile`,
        url: SITE,
        name: title,
        description,
        isPartOf: { '@id': `${SITE}#website` },
        mainEntity: { '@id': PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: profile.name,
        alternateName: 'Nev',
        url: 'https://www.nevcan.com/',
        // "Software architect · co-founder & CTPO @ Dipnot" → "Software architect"
        jobTitle: profile.headline.split('·')[0]!.trim(),
        worksFor: { '@type': 'Organization', name: 'Dipnot', url: 'https://dipnot.app' },
        sameAs: SAME_AS,
      },
    ],
  };
}
