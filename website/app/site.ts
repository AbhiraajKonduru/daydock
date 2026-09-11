export const CONTACT_EMAIL = "abhiraaj.konduru2011@gmail.com";
export const GITHUB_URL = "https://github.com/AbhiraajKonduru/daydock";
export const SITE_URL = "https://daydock.vercel.app";

/** The video that explains the self sabotage cycle. We are not affiliated with the creator. */
export const CYCLE_VIDEO = {
  id: "u1U_JBut2-c",
  creator: "Clark Kegley",
  title: "Give me 17 minutes and I'll eliminate your self-sabotage forever",
};

/** Hack Club HCB fiscal sponsorship. Application in progress, so nothing here claims approval yet. */
export const FISCAL = {
  sponsor: "The Hack Foundation (d.b.a. Hack Club)",
  program: "Hack Club HCB",
  ein: "81-2908499",
  feePercent: 7,
  status: "in progress" as const,
};

export const FUNDING_GOAL = 20000;

/**
 * What unlocks at what level of funding. These are commitments, not hopes, so
 * the wording on /support and /roadmap has to stay identical.
 */
export const MILESTONES = [
  {
    amount: 10000,
    title: "Daydock on your phone",
    summary: "A mobile app, free like the desktop one.",
    detail:
      "The single most common thing people tell us is that the day happens away from a desk. A phone app is the difference between writing your day down and remembering that you meant to. It is free when it ships, the same as everything else we make.",
  },
  {
    amount: 20000,
    title: "A hosted version you buy once",
    summary: "Your notebook in a browser, on a server, for a hundred years, for one payment.",
    detail:
      "Some people cannot install software, or want their notebook on a school Chromebook. So we will build a hosted web version and sell it the only way we are willing to: you pay once, we run it for a hundred years, and the price is what the servers cost us. No margin and no subscription.",
  },
] as const;
