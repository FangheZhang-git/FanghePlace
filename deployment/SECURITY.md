# Security hardening — local implementation, not a deployment certificate

The November 8, 2026 changes restrict static delivery to public pages/assets, validate JSON scalar inputs before mysql2 queries, validate profile/scholarship ranges and categories, normalize booleans, limit API traffic to 120 requests/minute/IP, and retain the existing comment/submission limits. Authentication allows 10 attempts/15 minutes/IP, plus 10 unsuccessful login attempts/15 minutes/account. Account keys are hashed in limiter memory. Limits reset on process restart and are per process; use a shared store or gateway limits before running multiple instances. Account throttling can temporarily affect the legitimate account owner too.

Passwords at signup must have at least 12 characters and at most 72 UTF-8 bytes. Existing shorter passwords still work. Login uses a generic credential error and a dummy bcrypt comparison for unknown accounts. JWT secrets must be at least 32 bytes; generate random material outside source control. The weak local JWT secret was replaced with random material; local sessions must log in again. Production secrets were not accessed or changed. JWT signatures explicitly require HS256. JSON size is capped at 50 KB; malformed JSON gets 400, oversized bodies 413. The site still uses localStorage bearer tokens and has no full enforced CSP; these remain follow-up hardening work, not completed protections.

## Activate CAPTCHA

Create a Cloudflare Turnstile widget restricted to your real domains. In deployment secrets, configure TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY and comma-separated TURNSTILE_HOSTNAMES (e.g. scholarmatch.net,www.scholarmatch.net). Set NODE_ENV=production. Startup refuses production without these values; partial configuration also fails. Development with neither key disables CAPTCHA, but keeps rate limits and validation. Never use provider test keys in production.

Login/signup fetch only the public site key. The server verifies the token with Cloudflare, checks hostname and login/signup action, and fails closed on rejection or outage. Tokens are single-use and expire after five minutes; the client resets after each attempt. Real provider validation needs real keys and network access. The privacy notice now describes this verification service; review it with the final production setup before release.

## Network and deployment

The application now defaults to HOST=127.0.0.1. Use PORT=3001 behind an HTTPS reverse proxy and TRUSTED_PROXIES=loopback only when nginx is on the same host. Set FRONTEND_ORIGIN to actual frontend origins. Containers may need HOST=0.0.0.0 internally; do not publish application or MySQL ports to the internet. Managed hosting requires the host/platform-specific proxy configuration, not a blind copy of this example.

nginx.conf.example provides TLS termination, connection/request limits and forwarding-header replacement. Install certificates first; run nginx -t before reload. The template must be adapted if Cloudflare or another proxy is in front: trust only that provider's verified proxy ranges and prevent direct origin bypass. Do not serve the repository as an nginx document root. All requests must go through Express's public-file allowlist.

For a single Ubuntu VPS, review existing rules first using `sudo ufw status numbered` and `sudo ss -lntup`. Intended inbound access: 443 (website), 80 (HTTPS redirect/certificate renewal), and SSH only from your management IP or VPN. No public 3001/5000/3306. Review IPv6 and cloud security-group rules too. Configure MySQL to loopback/private networking with a least-privilege application account, not root.

Example UFW policy (replace MANAGEMENT_IP and SSH_PORT; do not paste placeholders):

```sh
sudo ufw allow from MANAGEMENT_IP to any port SSH_PORT proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
sudo ufw status numbered
```

Keep a second administrative connection and provider console available while applying rules. Existing broad allow rules must be reviewed; default-deny does not remove them. Docker port publishing can bypass UFW; enforce private binding and cloud firewall rules as well. These commands were NOT run on a production server.

## WAF / abuse protection

Application validation and nginx limits are not a managed WAF or volumetric DDoS defense. At the hosting/CDN layer enable managed WAF rules for SQL injection/XSS and rate limits for /login, /signup, /search, /match and writes. Stage WAF rules in logging mode to avoid blocking genuine scholarship descriptions. Do not add a naive SQL-keyword blacklist: parameterized queries plus primitive-type validation are the application defense. Protect the origin so attackers cannot bypass the edge.

## Verify after deployment

- Public pages, CSS and scripts return 200. /server.js, /security.js, /package.json, /scholarmatch-production.sql, /database/research/, /node_modules/ and /.env return 404.
- Real login/signup pass CAPTCHA; missing/reused/expired tokens fail; provider outages do not bypass verification. Confirm existing users can log in and signup/profile/save/comment/submission flows work.
- Confirm trusted client IPs and 429 responses, including requests with forged X-Forwarded-For.
- Verify private API responses have Cache-Control: no-store and malformed JSON does not expose stack traces.
- Test externally that only intended ports are reachable (including IPv6). Check database grants and backup access.
- Review access logs for requests to SQL/source paths. Earlier repository-wide static serving made these accessible if that version was deployed; this is potential disclosure, not evidence of server takeover. If logs establish exposure, review leaked contents and rotate affected credentials/session secrets as appropriate.

References: [Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/), [nginx request limits](https://docs.nginx.com/nginx/admin-guide/security-controls/controlling-access-proxied-http/), [Ubuntu UFW](https://wiki.ubuntu.com/UFW).
