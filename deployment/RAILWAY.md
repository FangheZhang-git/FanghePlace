# ScholarMatch on Railway

Use this guide for the current Railway deployment; nginx/UFW instructions in SECURITY.md are for a self-managed VPS only.

## Required app variables before deploying the changed code

- NODE_ENV=production
- HOST=0.0.0.0 (automatically selected when RAILWAY_ENVIRONMENT_ID exists and HOST is unset)
- Preserve Railway's PORT and domain target-port mapping (the inspected service uses 8080).
- FRONTEND_ORIGIN=https://scholarmatch.net,https://fangheplace-production.up.railway.app (include other domains only if actually used)
- JWT_SECRET: a random secret at least 32 bytes long. Changing the production value invalidates existing login tokens; the production value has not been changed here.
- TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY: real widget keys, entered as Railway secrets, never committed or pasted in chat.
- TURNSTILE_HOSTNAMES=scholarmatch.net,fangheplace-production.up.railway.app (also register these in Turnstile).
- TRUSTED_PROXY_HOPS=1, with TRUSTED_PROXIES unset, ONLY if the app is reachable publicly through Railway's HTTP edge alone, has no TCP proxy, and all services in the same private environment are trusted. Verify forwarded-header behavior after deployment. Hop-count trust is unsafe if direct untrusted ingress exists.

The app fails startup if production CAPTCHA or JWT configuration is missing. Configure the variables before deploying. Do not set NODE_ENV=development to bypass production verification.

## Database exposure

Use DB_HOST pointing at the MySQL service's private railway.internal hostname, DB_USER/DB_PASSWORD for a restricted application account, and DB_NAME for the app database. The application currently uses MySQL's default port 3306. Verify private connectivity before removing a database public TCP proxy. Public proxy removal can break local SQL clients/import scripts and may allocate a different public endpoint if recreated; move administration to a private tunnel/forwarder first if needed. Do not delete the database or volume.

## Platform defenses

The website service has an HTTPS custom domain and a Railway HTTPS domain. Internal port 8080 shown in the UI is a target port, not evidence that raw public port 8080 is exposed. Review TCP Proxy separately for BOTH the website and database services.

A private-file block rule was saved and verified on both public domains through Edge Rules to return 404 for backend source, SQL/Markdown snapshots, environment/git paths, dependency and internal directories. Keep it as defense in depth after the application allowlist deploys. It is not a general SQL-injection WAF. Keep actual SQL protection in parameterized queries and request type validation.

Railway Under Attack Mode is incident protection; it blocks non-browser requests, so leave it off during normal operation unless there is an actual attack and its API impact is understood. Do not treat its off state as proof that the platform has no security.

The application limiter currently uses process memory. The inspected service has one replica. Add a shared rate-limit store or gateway enforcement before scaling horizontally. Restarts reset counters.

## Release checks

Run npm test and verify production secrets before deploying the code. After deployment verify real Turnstile login/signup, profile/save/comment/submission flows, HTTP 404 for private file paths on BOTH public domains, normal homepage/assets, no-store headers on authenticated APIs, and independent client-IP throttling. No live user record should be used for destructive testing.

Sources: [Railway networking](https://docs.railway.com/networking), [private networking](https://docs.railway.com/networking/private-networking/how-it-works), [TCP proxy](https://docs.railway.com/networking/tcp-proxy), [edge rules](https://docs.railway.com/networking/edge-rules), [WAF](https://docs.railway.com/networking/waf). Railway's support bot describes overwritten HTTP-edge forwarding headers and private-network/TCP exceptions [here](https://station.railway.com/questions/security-questions-edge-to-container-ne-be34a2af); that reply is not a substitute for testing your ingress configuration.

## Verified in this session

- Railway UI: ScholarMatch production / FanghePlace uses one replica, HTTP domains target port 8080, no website TCP proxy shown.
- App DB_HOST is mysql.railway.internal. On November 9, 2026, removed MySQL's public TCP proxy with user approval. Railway now shows Add Public Access and retains mysql.railway.internal private networking. The database service and volume were preserved.
- After removal, GET https://scholarmatch.net/scholarships returned HTTP 200 with 47 records, confirming the website's database read path still works. External clients using the old public endpoint must use a Railway tunnel instead.
- On November 9, all three Turnstile variables were present. Allowed hostnames match the two public domains. JWT_SECRET passed the 32-byte minimum without printing its value; randomness cannot be proven from length. The secret was not changed. NODE_ENV=production and TRUSTED_PROXY_HOPS=1 were applied after confirming HTTP-only ingress.
- Saved edge rule: Block private project files; exact configuration is in railway-edge-rules.json.
- Eight external HEAD checks: homepage and login.js returned 200, server.js and SQL snapshot returned 404, on both domains.
- Local tests: all 36 passed; live Express smoke checks and mocked CAPTCHA browser checks passed. MySQL startup connection succeeded; no database writes were performed by validation.
- Security-only release prepared from production commit 84cab5f. Unrelated scholarship research/matching/crawler changes are excluded. Production dependencies were patched within compatible version ranges; crawler and browser tooling moved to devDependencies. npm audit --omit=dev reports zero vulnerabilities; development crawler tooling retains moderate advisories. The six security tests pass against the installed release dependencies. Genuine production CAPTCHA acceptance must be checked after deployment.
