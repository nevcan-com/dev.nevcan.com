/**
 * Google Analytics 4, with consent. Same setup as dive.nevcan.com (src/data/analytics.ts there):
 * GA account "nevcan.com", a property of its own for dev.nevcan.com with the same settings
 * (retention 14 months, Google signals off, user-provided data off, ads personalization off,
 * DPA accepted).
 *
 * Consent Mode Basic: gtag.js is not loaded at all until the visitor accepts. What visitors type
 * in the terminal is never sent anywhere; GA4 only sees page views (it counts the URL changes
 * when a file is opened, through enhanced measurement's "browser history events").
 */
export const ANALYTICS = {
  /**
   * The release switch. While false, the production build has no banner and no "Cookies" item in
   * the status bar. `astro dev` always shows them. Turn on together with `measurementId`.
   */
  live: true,
  /** the dev.nevcan.com web stream (Google tag GTM-MVGJ4575) */
  measurementId: 'G-TH8LTJR6SL',
  /** the KVKK Art. 9 basis for the transfer abroad, as on dive.nevcan.com's privacy page */
  transferBasis:
    'your explicit consent to this transfer (KVKK Art. 9(6)(a)), which you give by choosing "Accept" after being told the risks: the Personal Data Protection Board has not decided that the US provides adequate protection, no standard contract approved by the Board is in place with Google, and US authorities may be able to access the data under US law. For visitors in the EU: the EU Standard Contractual Clauses in Google\'s data processing terms (GDPR Art. 46(2)(c))',
  /** gtag loads only here: localhost and preview builds never send anything */
  host: 'dev.nevcan.com',
  /**
   * Cookies are named dev_ga / dev_ga_… and kept to this host, so they are never shared with
   * dive.nevcan.com or www.nevcan.com, and withdrawing consent here removes them.
   */
  cookiePrefix: 'dev',
  /** the visitor's choice, in localStorage */
  storageKey: 'dev-consent',
  /** after this the visitor is asked again */
  choiceMonths: 12,
} as const;

/** whether the consent banner and the status bar's "Cookies" item are on */
export const analyticsOn = ANALYTICS.live || import.meta.env.DEV;

if (ANALYTICS.live && !/^G-[A-Z0-9]+$/.test(ANALYTICS.measurementId))
  throw new Error('analytics.ts: live is on but measurementId is not a G-… ID');
