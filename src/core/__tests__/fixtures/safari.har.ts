// A HAR shaped like Safari Web Inspector's export: Safari commonly reports
// -1 (unknown) for content.size, headersSize, and bodySize instead of
// omitting the fields outright, and its timings object is sparser than
// Chrome's or Firefox's.
export const safariHar = {
  log: {
    version: "1.2",
    creator: { name: "WebKit", version: "18.0" },
    entries: [
      {
        startedDateTime: "2026-01-01T00:00:00.000Z",
        time: 160,
        request: { method: "GET", url: "https://example.com/" },
        response: {
          status: 200,
          content: { size: 2_900, mimeType: "text/html" },
          headersSize: -1,
          bodySize: -1,
        },
        timings: { send: 0, wait: 120, receive: 40 },
      },
      {
        startedDateTime: "2026-01-01T00:00:00.170Z",
        time: 30,
        request: { method: "GET", url: "https://example.com/cached.js" },
        response: {
          status: 200,
          content: { size: -1, mimeType: "application/javascript" },
          headersSize: -1,
          bodySize: -1,
        },
        timings: { send: 0, wait: 20, receive: 10 },
      },
    ],
  },
};
