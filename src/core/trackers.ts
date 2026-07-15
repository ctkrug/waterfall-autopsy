// Known third-party analytics/ads/session-replay hosts. Deliberately a small,
// curated list rather than a broad heuristic (e.g. "any host with 'analytics'
// in it") — a false "this is a tracker" verdict erodes trust in the report
// faster than missing an obscure one. Extend this list as new offenders are
// confirmed, not by guessing.
export const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "googlesyndication.com",
  "facebook.net",
  "connect.facebook.net",
  "facebook.com",
  "hotjar.com",
  "segment.io",
  "segment.com",
  "mixpanel.com",
  "fullstory.com",
  "intercom.io",
  "amplitude.com",
  "hs-scripts.com",
  "hs-analytics.net",
  "clarity.ms",
  "snowplowanalytics.com",
  "newrelic.com",
  "nr-data.net",
  "bugsnag.com",
  "sentry.io",
  "optimizely.com",
  "crazyegg.com",
];

export function isTrackerHost(host: string): boolean {
  return TRACKER_HOSTS.some((tracker) => host === tracker || host.endsWith(`.${tracker}`));
}
