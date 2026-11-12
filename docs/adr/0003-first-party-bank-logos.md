# Bank logos are served first-party

The browser never contacts a logo CDN. `BankLogo` loads `/api/logos/<code>` from the Next.js app, which fetches the logo from the upstream host server-side, caches it in memory and serves it same-origin with long `Cache-Control`.

## Why

- The privacy rule is "no third-party CDNs": a CDN request leaks the viewer's IP and the bank they are looking at, and on the Pay page it would sit next to payment details.
- vietqr-api bundles logos (`assets/logos/<BIN>.png`) but only to draw them into QR images, and the asset directory is optional, so it does not serve them and cannot be relied on to cover the whole catalog. Adding an API route would also change the API contract for a web-only concern.

## Consequences

- The logo URL comes only from the API catalog, looked up by bank code; the client never supplies a URL (no SSRF through the route).
- The server fetch requires https, a host in the allowlist (`VIETQR_LOGO_HOSTS`, default: hosts of the catalog's own logo URLs, never IP literals or internal names), an `image/*` content type, a 512 KiB cap and a 5 s timeout, and follows redirects only within the same host.
- Unknown code gives 404; any upstream failure gives 502, so the UI falls back to the code badge.
- The web server needs outbound HTTPS to the logo host. Air-gapped deployments get code badges.
- Responses carry `nosniff` and a sandboxing CSP; the catalog and logos are cached in process (catalog 10 minutes, logos 24 hours), so each instance fetches a logo at most once a day.

## Alternatives considered

- A logo route in vietqr-api serving the bundled files: no outbound traffic from the web app, but the bundle is optional and incomplete, and it changes the API and its OpenAPI contract.
- Vendoring logos into `public/`: no runtime fetch, but licensing and staleness become ours to manage.
