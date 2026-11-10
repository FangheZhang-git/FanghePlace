const fs = require("fs/promises");
const path = require("path");
const { collectScholarshipClues } = require("./extractors");
const { buildEmptyWinnerBackground, fillScholarshipFallbacks } = require("./inference");
const { attachValidation } = require("./validation");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_SEEDS_PATH = path.join(PROJECT_ROOT, "crawler", "seeds", "scholarships.json");
const DEFAULT_KNOWN_EXISTING_PATH = path.join(PROJECT_ROOT, "crawler", "seeds", "known-existing-scholarships.json");
const DEFAULT_EXISTING_SQL_PATH = path.join(PROJECT_ROOT, "scholarmatch-production.sql");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "crawler", "output");
const SCHOLARSHIP_OUTPUT_PATH = path.join(OUTPUT_DIR, "scholarships-staging.json");
const WINNER_OUTPUT_PATH = path.join(OUTPUT_DIR, "winner-background-staging.json");
const SKIPPED_OUTPUT_PATH = path.join(OUTPUT_DIR, "skipped-existing-scholarships.json");
const USER_AGENT = "ScholarMatchCrawler/0.1 (+https://scholarmatch.net)";
const DRY_RUN = process.argv.includes("--dry-run");
const STATIC_MODE = process.argv.includes("--static") || process.env.CRAWLER_MODE === "static";
const ALLOW_EXISTING = process.argv.includes("--allow-existing") || process.env.CRAWLER_ALLOW_EXISTING === "1";
const PAGE_TIMEOUT_MS = Number(process.env.CRAWLER_PAGE_TIMEOUT_MS || 20000);
const MAX_RESPONSE_BYTES = Number(process.env.CRAWLER_MAX_RESPONSE_BYTES || 3000000);
const MAX_PAGE_TEXT_CHARACTERS = Number(process.env.CRAWLER_MAX_PAGE_TEXT_CHARACTERS || 200000);

const delayByDomain = new Map();
const logger = {
  info: (message) => console.log(`[info] ${message}`),
  warning: (message) => console.warn(`[warn] ${message}`)
};

async function readLimitedText(response, maxBytes = MAX_RESPONSE_BYTES) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error(`Response exceeds ${maxBytes} byte limit.`);

  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) throw new Error(`Response exceeds ${maxBytes} byte limit.`);
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeds ${maxBytes} byte limit.`);
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function fetchTextResource(url, { timeoutMs = PAGE_TIMEOUT_MS, maxBytes = MAX_RESPONSE_BYTES, expectedTypes = ["text/html", "application/xhtml+xml"] } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (expectedTypes?.length && contentType && !expectedTypes.some((type) => contentType.includes(type))) {
      throw new Error(`Unexpected content type ${contentType}.`);
    }

    return {
      finalUrl: response.url || url,
      text: await readLimitedText(response, maxBytes)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function domainFromUrl(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\b(scholarships?|programs?|foundation|fund|award)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch (_error) {
    return "";
  }
}

function isLikelySameScholarship(seed, existing) {
  const seedName = normalizeName(seed.userData?.seedName);
  const existingName = normalizeName(existing.name);
  const seedUrl = normalizeUrl(seed.url);
  const existingUrl = normalizeUrl(existing.apply_url || existing.source_url);

  if (seedUrl && existingUrl && seedUrl === existingUrl) return true;
  if (!seedName || !existingName) return false;
  if (seedName === existingName) return true;

  const shorter = seedName.length < existingName.length ? seedName : existingName;
  const longer = seedName.length < existingName.length ? existingName : seedName;
  const shorterTokens = shorter.split(" ").filter(Boolean);

  return shorterTokens.length >= 2 && shorter.length >= 8 && longer.includes(shorter);
}

function readSqlStatement(sql, marker) {
  const start = sql.indexOf(marker);
  if (start === -1) return "";

  let inString = false;
  let escaped = false;
  for (let index = start; index < sql.length; index += 1) {
    const char = sql[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (char === "'") {
      inString = !inString;
      continue;
    }

    if (char === ";" && !inString) {
      return sql.slice(start, index);
    }
  }

  return sql.slice(start);
}

function splitSqlRows(valuesSql) {
  const rows = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let row = "";

  for (const char of valuesSql) {
    if (escaped) {
      row += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      row += char;
      escaped = true;
      continue;
    }

    if (char === "'") {
      row += char;
      inString = !inString;
      continue;
    }

    if (!inString && char === "(") {
      if (depth > 0) row += char;
      depth += 1;
      continue;
    }

    if (!inString && char === ")") {
      depth -= 1;
      if (depth === 0) {
        rows.push(row);
        row = "";
      } else {
        row += char;
      }
      continue;
    }

    if (depth > 0) row += char;
  }

  return rows;
}

function splitSqlValues(rowSql) {
  const values = [];
  let inString = false;
  let escaped = false;
  let current = "";

  for (const char of rowSql) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      current += char;
      escaped = true;
      continue;
    }

    if (char === "'") {
      inString = !inString;
      current += char;
      continue;
    }

    if (char === "," && !inString) {
      values.push(parseSqlValue(current));
      current = "";
      continue;
    }

    current += char;
  }

  values.push(parseSqlValue(current));
  return values;
}

function parseSqlValue(value) {
  const trimmed = value.trim();
  if (/^null$/i.test(trimmed)) return null;
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/''/g, "'")
      .replace(/\\"/g, "\"")
      .replace(/\\\\/g, "\\");
  }
  return trimmed;
}

async function readExistingScholarshipsFromSql() {
  const sqlPath = getArgValue("--existing-sql", process.env.CRAWLER_EXISTING_SQL_PATH || DEFAULT_EXISTING_SQL_PATH);

  try {
    const sql = await fs.readFile(sqlPath, "utf8");
    const statement = readSqlStatement(sql, "INSERT INTO `scholarships` VALUES");
    const rows = splitSqlRows(statement);

    return rows
      .map(splitSqlValues)
      .map((values) => ({
        name: values[1],
        provider: values[2],
        apply_url: values[19],
        source: "scholarmatch-production.sql"
      }))
      .filter((record) => record.name);
  } catch (error) {
    logger.warning(`Could not read existing scholarships from SQL snapshot: ${error.message}`);
    return [];
  }
}

async function readExistingScholarshipsFromKnownList() {
  const listPath = getArgValue("--known-existing", process.env.CRAWLER_KNOWN_EXISTING_PATH || DEFAULT_KNOWN_EXISTING_PATH);

  try {
    const raw = await fs.readFile(listPath, "utf8");
    return JSON.parse(raw)
      .map((record) => ({
        name: record.name,
        provider: record.provider || "",
        apply_url: record.apply_url || record.url || "",
        source: "known-existing-scholarships.json"
      }))
      .filter((record) => record.name || record.apply_url);
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.warning(`Could not read known existing scholarships list: ${error.message}`);
    }
    return [];
  }
}

async function readExistingScholarshipsFromDatabase() {
  try {
    require("dotenv").config({ path: path.join(PROJECT_ROOT, ".env") });
  } catch (_error) {
    return [];
  }

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    return [];
  }

  let connection;
  try {
    const mysql = require("mysql2/promise");
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    const [rows] = await connection.query("SELECT name, provider, apply_url FROM scholarships");
    return rows.map((row) => ({
      name: row.name,
      provider: row.provider,
      apply_url: row.apply_url,
      source: "mysql"
    }));
  } catch (error) {
    logger.warning(`Could not read existing scholarships from MySQL; using SQL snapshot only. ${error.message}`);
    return [];
  } finally {
    if (connection) await connection.end();
  }
}

async function filterExistingScholarshipRequests(requests) {
  if (ALLOW_EXISTING) {
    return { newRequests: requests, existingSkipped: [] };
  }

  const existing = [
    ...await readExistingScholarshipsFromKnownList(),
    ...await readExistingScholarshipsFromSql(),
    ...await readExistingScholarshipsFromDatabase()
  ];
  const newRequests = [];
  const existingSkipped = [];

  for (const request of requests) {
    const match = existing.find((record) => isLikelySameScholarship(request, record));
    if (match) {
      existingSkipped.push({
        name: request.userData.seedName || request.url,
        url: request.url,
        matched_existing_name: match.name,
        matched_existing_provider: match.provider || "",
        matched_existing_apply_url: match.apply_url || "",
        match_source: match.source
      });
    } else {
      newRequests.push(request);
    }
  }

  return { newRequests, existingSkipped };
}

async function readSeeds() {
  const seedPath = getArgValue("--seeds", DEFAULT_SEEDS_PATH);
  const raw = await fs.readFile(seedPath, "utf8");
  return JSON.parse(raw).map((seed, crawlIndex) => ({
    uniqueKey: seed.url,
    url: seed.url,
    userData: {
      seedName: seed.name || "",
      crawlIndex
    }
  }));
}

async function fetchRobotsForUrl(url) {
  const robotsUrl = new URL("/robots.txt", url).href;
  try {
    const result = await fetchTextResource(robotsUrl, {
      timeoutMs: Number(process.env.CRAWLER_ROBOTS_TIMEOUT_MS || 5000),
      maxBytes: Number(process.env.CRAWLER_ROBOTS_MAX_BYTES || 500000),
      expectedTypes: ["text/plain"]
    });
    return parseRobotsTxt(result.text);
  } catch (error) {
    logger.warning(`Could not fetch robots.txt for ${new URL(url).origin}; allowing seeded URL with throttling. ${error.message}`);
    return parseRobotsTxt("");
  }
}

function parseRobotsTxt(body) {
  const groups = [];
  let currentGroup = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const [rawKey, ...rawValue] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join(":").trim();

    if (key === "user-agent") {
      if (!currentGroup || currentGroup.rules.length) {
        currentGroup = { agents: [], rules: [] };
        groups.push(currentGroup);
      }
      currentGroup.agents.push(value.toLowerCase());
      continue;
    }

    if (currentGroup && (key === "allow" || key === "disallow") && value) {
      currentGroup.rules.push({ type: key, path: value });
    }
  }

  const crawlerToken = "scholarmatchcrawler";
  const specificGroups = groups.filter((group) => group.agents.some((agent) => agent !== "*" && crawlerToken.includes(agent)));
  const applicableGroups = specificGroups.length
    ? specificGroups
    : groups.filter((group) => group.agents.includes("*"));
  const rules = applicableGroups.flatMap((group) => group.rules);

  function matchesRule(path, rulePath) {
    const endAnchored = rulePath.endsWith("$");
    const source = (endAnchored ? rulePath.slice(0, -1) : rulePath)
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${source}${endAnchored ? "$" : ""}`).test(path);
  }

  return {
    isAllowed(url) {
      const parsed = new URL(url);
      const path = `${parsed.pathname}${parsed.search}`;
      const matches = rules.filter((rule) => matchesRule(path, rule.path));
      if (!matches.length) return true;
      matches.sort((a, b) => b.path.length - a.path.length || (a.type === "allow" ? -1 : 1));
      return matches[0].type === "allow";
    }
  };
}

async function filterAllowedRequests(requests) {
  const robotsByDomain = new Map();
  const allowed = [];
  const skipped = [];

  for (const request of requests) {
    const origin = new URL(request.url).origin;
    if (!robotsByDomain.has(origin)) {
      robotsByDomain.set(origin, await fetchRobotsForUrl(request.url));
    }

    const robots = robotsByDomain.get(origin);
    if (robots.isAllowed(request.url, USER_AGENT) !== false) {
      allowed.push(request);
    } else {
      skipped.push(request.url);
    }
  }

  return { allowed, skipped };
}

async function waitForDomainThrottle(url) {
  const domain = domainFromUrl(url);
  const delayMs = Number(process.env.CRAWLER_DOMAIN_DELAY_MS || 3000);
  const now = Date.now();
  const reservedAt = Math.max(now, delayByDomain.get(domain) || 0);
  const waitMs = reservedAt - now;
  delayByDomain.set(domain, reservedAt + delayMs);

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

async function extractPageData(page, request) {
  return page.evaluate(({ seedName, sourceUrl, crawlIndex, maxTextCharacters }) => {
    const ignoredSelectors = "script, style, noscript, svg, canvas, iframe";
    document.querySelectorAll(ignoredSelectors).forEach((node) => node.remove());

    const linkNodes = [...document.querySelectorAll("a[href]")].slice(0, 80);
    const links = linkNodes.map((link) => ({
      text: (link.innerText || link.textContent || "").replace(/\s+/g, " ").trim(),
      href: new URL(link.getAttribute("href"), location.href).href
    }));

    const headings = [...document.querySelectorAll("h1, h2, h3")]
      .map((node) => (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 40);

    const tables = [...document.querySelectorAll("table")]
      .map((table) => (table.innerText || table.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 10);

    const main = document.querySelector("main") || document.body;

    return {
      seedName,
      crawlIndex,
      url: sourceUrl,
      finalUrl: location.href,
      title: document.title,
      description: document.querySelector("meta[name='description']")?.content || "",
      headings,
      tables,
      links,
      text: (main.innerText || main.textContent || "").replace(/\s+/g, " ").trim().slice(0, maxTextCharacters)
    };
  }, {
    seedName: request.userData.seedName,
    sourceUrl: request.url,
    crawlIndex: request.userData.crawlIndex,
    maxTextCharacters: MAX_PAGE_TEXT_CHARACTERS
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractAttribute(tag, name) {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] || "";
}

function extractStaticPageData(html, request, finalUrl) {
  const withoutIgnored = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const title = stripTags(withoutIgnored.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = extractAttribute(withoutIgnored.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] || "", "content");

  const headings = [...withoutIgnored.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
    .slice(0, 40);

  const tables = [...withoutIgnored.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
    .slice(0, 10);

  const links = [...withoutIgnored.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      try {
        return {
          href: new URL(decodeHtml(match[1]), finalUrl).href,
          text: stripTags(match[2])
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, 80);

  return {
    seedName: request.userData.seedName,
    crawlIndex: request.userData.crawlIndex,
    url: request.url,
    finalUrl,
    title,
    description,
    headings,
    tables,
    links,
    text: stripTags(withoutIgnored).slice(0, MAX_PAGE_TEXT_CHARACTERS)
  };
}

async function writeOutputs(scholarships, winnerBackground) {
  scholarships.sort((a, b) => (a.crawl_index ?? Number.MAX_SAFE_INTEGER) - (b.crawl_index ?? Number.MAX_SAFE_INTEGER));
  winnerBackground.sort((a, b) => (a.crawl_index ?? Number.MAX_SAFE_INTEGER) - (b.crawl_index ?? Number.MAX_SAFE_INTEGER));
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SCHOLARSHIP_OUTPUT_PATH, `${JSON.stringify(scholarships, null, 2)}\n`);
  await fs.writeFile(WINNER_OUTPUT_PATH, `${JSON.stringify(winnerBackground, null, 2)}\n`);
}

async function writeSkippedExistingOutput(existingSkipped) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SKIPPED_OUTPUT_PATH, `${JSON.stringify(existingSkipped, null, 2)}\n`);
}

async function handleExtractedPage(pageData, scholarships, winnerBackground) {
  const extracted = collectScholarshipClues({
    ...pageData,
    url: pageData.finalUrl || pageData.url
  });
  const scholarship = attachValidation(fillScholarshipFallbacks(extracted));

  scholarships.push(scholarship);
  winnerBackground.push(buildEmptyWinnerBackground(scholarship));
  logger.info(`Extracted ${scholarship.name}`);
}

async function runStaticCrawler(allowed) {
  const scholarships = [];
  const winnerBackground = [];
  const maxConcurrency = Number(process.env.CRAWLER_MAX_CONCURRENCY || 4);
  let cursor = 0;

  async function worker() {
    while (cursor < allowed.length) {
      const request = allowed[cursor];
      cursor += 1;

      try {
        await waitForDomainThrottle(request.url);
        const response = await fetchTextResource(request.url);
        const pageData = extractStaticPageData(response.text, request, response.finalUrl);
        await handleExtractedPage(pageData, scholarships, winnerBackground);
      } catch (error) {
        const failed = attachValidation(fillScholarshipFallbacks({
          name: request.userData.seedName || "Unknown",
          provider: domainFromUrl(request.url),
          source_url: request.url,
          crawl_index: request.userData.crawlIndex,
          source_text: "",
          extraction_status: "failed",
          confidence: "low",
          description: `Static crawler failed: ${error.message}`
        }));
        scholarships.push(failed);
        winnerBackground.push(buildEmptyWinnerBackground(failed));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(maxConcurrency, allowed.length) }, () => worker()));
  await writeOutputs(scholarships, winnerBackground);
}

async function main() {
  const seedRequests = await readSeeds();
  const { newRequests, existingSkipped } = await filterExistingScholarshipRequests(seedRequests);
  const { allowed, skipped } = await filterAllowedRequests(newRequests);
  await writeSkippedExistingOutput(existingSkipped);

  if (DRY_RUN) {
    console.log(JSON.stringify({
      allowed: allowed.map((request) => request.url),
      skipped_by_robots: skipped,
      skipped_existing: existingSkipped
    }, null, 2));
    return;
  }

  const scholarships = [];
  const winnerBackground = [];
  const maxConcurrency = Number(process.env.CRAWLER_MAX_CONCURRENCY || 4);

  if (STATIC_MODE) {
    logger.info(`Starting static crawl with ${allowed.length} allowed URL(s); ${skipped.length} skipped by robots.txt; ${existingSkipped.length} skipped because already in database.`);
    await runStaticCrawler(allowed);
    logger.info(`Wrote ${SCHOLARSHIP_OUTPUT_PATH}`);
    logger.info(`Wrote ${WINNER_OUTPUT_PATH}`);
    logger.info(`Wrote ${SKIPPED_OUTPUT_PATH}`);
    return;
  }

  const { PlaywrightCrawler, log } = require("crawlee");

  const crawler = new PlaywrightCrawler({
    maxConcurrency,
    maxRequestRetries: 1,
    navigationTimeoutSecs: 30,
    requestHandlerTimeoutSecs: 60,
    launchContext: {
      launchOptions: {
        headless: true,
        ...(process.env.CRAWLER_BROWSER_CHANNEL ? { channel: process.env.CRAWLER_BROWSER_CHANNEL } : {})
      }
    },
    preNavigationHooks: [
      async ({ page, request }, gotoOptions) => {
        await waitForDomainThrottle(request.url);
        await page.route("**/*", async (route) => {
          const resourceType = route.request().resourceType();
          if (["font", "image", "media"].includes(resourceType)) {
            await route.abort();
          } else {
            await route.continue();
          }
        });
        gotoOptions.waitUntil = "domcontentloaded";
      }
    ],
    async requestHandler({ page, request }) {
      await page.waitForLoadState("domcontentloaded");
      const pageData = await extractPageData(page, request);
      await handleExtractedPage(pageData, scholarships, winnerBackground);
    },
    async failedRequestHandler({ request }, error) {
      try {
        logger.warning(`Browser crawl failed for ${request.url}; trying static fallback.`);
        const response = await fetchTextResource(request.url);
        const pageData = extractStaticPageData(response.text, request, response.finalUrl);
        const beforeCount = scholarships.length;
        await handleExtractedPage(pageData, scholarships, winnerBackground);
        scholarships[beforeCount].extraction_status = "extracted_with_static_fallback";
        scholarships[beforeCount] = attachValidation(scholarships[beforeCount]);
      } catch (fallbackError) {
        const failed = attachValidation(fillScholarshipFallbacks({
          name: request.userData.seedName || "Unknown",
          provider: domainFromUrl(request.url),
          source_url: request.url,
          crawl_index: request.userData.crawlIndex,
          source_text: "",
          extraction_status: "failed",
          confidence: "low",
          description: `Crawler failed: ${error.message}; static fallback failed: ${fallbackError.message}`
        }));
        scholarships.push(failed);
        winnerBackground.push(buildEmptyWinnerBackground(failed));
      }
    }
  });

  log.info(`Starting crawl with ${allowed.length} allowed URL(s); ${skipped.length} skipped by robots.txt; ${existingSkipped.length} skipped because already in database.`);
  await crawler.run(allowed);

  await writeOutputs(scholarships, winnerBackground);
  log.info(`Wrote ${SCHOLARSHIP_OUTPUT_PATH}`);
  log.info(`Wrote ${WINNER_OUTPUT_PATH}`);
  log.info(`Wrote ${SKIPPED_OUTPUT_PATH}`);
}

if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  extractStaticPageData,
  fetchTextResource,
  isLikelySameScholarship,
  parseRobotsTxt,
  readLimitedText
};
