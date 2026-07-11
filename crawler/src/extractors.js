function compactText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return compactText(match[1] || match[0]);
  }

  return "";
}

function amountToNumber(value) {
  if (!value) return null;
  const normalized = value.replace(/[$,\s]/g, "").toLowerCase();
  const number = parseFloat(normalized);
  if (Number.isNaN(number)) return null;
  if (normalized.includes("million")) return Math.round(number * 1000000);
  if (normalized.includes("k")) return Math.round(number * 1000);
  return Math.round(number);
}

function getSentenceWindows(text, patterns) {
  const sentences = compactText(text)
    .split(/(?<=[.!?])\s+|\s+[|•]\s+/)
    .map(compactText)
    .filter(Boolean);

  return sentences.filter((sentence) => {
    const lowerSentence = sentence.toLowerCase();
    return patterns.some((pattern) => lowerSentence.includes(pattern));
  });
}

function collectAwardAmounts(text, seedName) {
  const candidates = [];
  const seedTokens = String(seedName || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5);

  for (const match of text.matchAll(/\$[\d,]+(?:\.\d+)?\s*(?:million|k)?/gi)) {
    const value = amountToNumber(match[0]);
    if (value === null || value > 250000) continue;

    const start = Math.max(0, match.index - 220);
    const end = Math.min(text.length, match.index + match[0].length + 220);
    const context = text.slice(start, end);
    const lowerContext = context.toLowerCase();
    let score = 0;

    if (/scholarship|award|receive|receives|recipient|up to|worth|valued at|per year|annually/i.test(context)) score += 2;
    if (/receive(?:s|d)?\s+(?:this\s+|a\s+|an\s+)?\$[\d,]+(?:\.\d+)?\s*(?:million|k)?\s+scholarship/i.test(context)) score += 6;
    if (/\$[\d,]+(?:\.\d+)?\s*(?:million|k)?\s+(?:college\s+)?scholarship/i.test(context)) score += 5;
    if (/scholarships?\s+(?:of|worth|valued at|up to)\s+\$[\d,]+(?:\.\d+)?\s*(?:million|k)?/i.test(context)) score += 4;
    if (/awards?\s+(?:of|worth|valued at|up to)\s+\$[\d,]+(?:\.\d+)?\s*(?:million|k)?/i.test(context)) score += 3;
    if (seedTokens.some((token) => lowerContext.includes(token))) score += 4;
    if (/total|over \$|more than \$|donated|raised|foundation supports|annual scholarships of/i.test(context)) score -= 5;
    if (/academic team|leaders of promise|community college/i.test(context) && !/academic team|leaders of promise/i.test(String(seedName || ""))) score -= 4;

    if (score > 0) candidates.push({ value, score });
  }

  if (!candidates.length) return [];

  const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
  return candidates
    .filter((candidate) => candidate.score >= bestScore - 1)
    .map((candidate) => candidate.value);
}

function collectScholarshipClues(pageData) {
  const text = compactText(pageData.text);
  const lowerText = text.toLowerCase();

  const amountNumbers = collectAwardAmounts(text, pageData.seedName || pageData.title);

  const gpaValue = firstMatch(text, [
    /(?:minimum|min\.?|at least)\s+(?:unweighted\s+)?GPA(?:\s+of)?\s*([0-4](?:\.\d{1,2})?)/i,
    /([0-4](?:\.\d{1,2})?)\s+(?:minimum\s+)?GPA/i
  ]);

  const satValue = firstMatch(text, [
    /(?:minimum|min\.?|at least)\s+SAT(?:\s+score)?(?:\s+of)?\s*(\d{3,4})/i,
    /SAT(?:\s+score)?(?:\s+of)?\s*(\d{3,4})/i
  ]);

  const actValue = firstMatch(text, [
    /(?:minimum|min\.?|at least)\s+ACT(?:\s+score)?(?:\s+of)?\s*(\d{1,2})/i,
    /ACT(?:\s+score)?(?:\s+of)?\s*(\d{1,2})/i
  ]);

  const deadline = firstMatch(text, [
    /deadline(?:\s+is|\s*:)?\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /apply by\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /applications? (?:are )?due\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i
  ]);

  const applyUrl = pageData.links.find((link) => /apply|application/i.test(`${link.text} ${link.href}`))?.href || pageData.url;

  return {
    name: pageData.seedName || pageData.title || "Unknown",
    provider: inferProvider(pageData),
    min_amount: amountNumbers.length ? Math.min(...amountNumbers) : null,
    max_amount: amountNumbers.length ? Math.max(...amountNumbers) : null,
    min_gpa: gpaValue ? parseFloat(gpaValue) : null,
    min_sat: satValue ? parseInt(satValue, 10) : null,
    min_act: actValue ? parseInt(actValue, 10) : null,
    citizenship: inferCitizenship(text),
    state: inferState(text),
    major: inferMajor(text),
    requires_essay: inferBoolean(lowerText, ["essay", "personal statement", "written response"]),
    first_gen_only: inferBoolean(lowerText, ["first-generation only", "first generation only", "first-generation students"]),
    leadership: inferBoolean(lowerText, ["leadership", "leader", "community service"]),
    min_income: inferIncome(text, "min"),
    max_income: inferIncome(text, "max"),
    renewable: inferBoolean(lowerText, ["renewable", "renew each year", "renewed annually"]),
    description: text.slice(0, 1200) || "No description extracted",
    apply_url: applyUrl,
    deadline: deadline || null,
    advanced_coursework_preferred: inferBoolean(lowerText, ["advanced coursework", "ap courses", "honors courses", "dual enrollment"]),
    award: inferBoolean(lowerText, ["award", "honor", "competition", "achievement"]),
    race: inferRace(text),
    type: inferScholarshipType(lowerText),
    source_url: pageData.url,
    source_text: text.slice(0, 5000),
    last_verified: new Date().toISOString(),
    confidence: "medium",
    extraction_status: "extracted"
  };
}

function inferProvider(pageData) {
  try {
    const hostname = new URL(pageData.url).hostname.replace(/^www\./, "");
    return pageData.seedName || hostname;
  } catch (_error) {
    return pageData.seedName || "Unknown";
  }
}

function inferBoolean(lowerText, needles) {
  return needles.some((needle) => lowerText.includes(needle.toLowerCase())) ? 1 : 0;
}

function inferCitizenship(text) {
  const eligibilityWindows = getSentenceWindows(text, ["eligible", "eligibility", "must be", "applicants must", "requirements", "citizen", "resident"]);
  const lowerText = eligibilityWindows.join(" ").toLowerCase();

  if (/(?:must|eligible|required|applicant).{0,80}(?:u\.s\. citizen|us citizen|u\.s\. national|united states citizen)/i.test(lowerText)) {
    return "U.S. Citizen";
  }

  if (/(?:must|eligible|required|applicant).{0,80}permanent resident/i.test(lowerText)) {
    return "Permanent Resident";
  }

  if (/international students?.{0,40}(?:eligible|may apply)/i.test(lowerText) && !/international students?.{0,40}(?:not|ineligible|cannot)/i.test(lowerText)) {
    return "International Student";
  }

  return "No Restriction";
}

function inferState(text) {
  const stateMatch = text.match(/\b(AL|CA|FL|GA|MA|NY|TX|WA)\b/);
  return stateMatch ? stateMatch[1] : "No Restriction";
}

function inferMajor(text) {
  const majorWindows = getSentenceWindows(text, ["major", "field of study", "study in", "discipline", "category"]);
  const scopedText = majorWindows.join(" ").toLowerCase();
  if (!scopedText) return "No Restriction";

  const majors = [
    "Computer Science",
    "Engineering",
    "Biology",
    "Chemistry",
    "Mathematics",
    "Business",
    "Economics",
    "Finance",
    "Political Science",
    "Psychology",
    "Pre-Med / Health Sciences",
    "Environmental Science"
  ];

  return majors.find((major) => scopedText.includes(major.toLowerCase())) || "No Restriction";
}

function inferIncome(text, kind) {
  const incomeWindows = getSentenceWindows(text, ["income", "household income", "family income", "financial need"]);
  if (!incomeWindows.length) return null;

  const values = [];
  for (const window of incomeWindows) {
    for (const match of window.matchAll(/\$[\d,]+/g)) {
      const value = amountToNumber(match[0]);
      if (value !== null && value >= 5000 && value <= 300000) values.push(value);
    }
  }

  if (!values.length) return null;
  return kind === "max" ? Math.max(...values) : Math.min(...values);
}

function inferRace(text) {
  if (!/\b(race|ethnicity|heritage|identify as|racial|ethnic)\b/i.test(text)) {
    return "No Restriction";
  }

  const raceWindows = getSentenceWindows(text, ["race", "ethnicity", "heritage", "identify as", "racial", "ethnic"]);
  const lowerText = raceWindows.join(" ").toLowerCase();
  if (!lowerText) return "No Restriction";

  const races = [
    "White/Caucasian",
    "Black or African American",
    "Asian",
    "Native American / Alaska Native",
    "Native Hawaiian / Pacific Islander",
    "Hispanic / Latino",
    "Middle Eastern / North African (MENA)",
    "Two or More Races / Multiracial"
  ];

  return races.find((race) => lowerText.includes(race.toLowerCase().split("/")[0].trim())) || "No Restriction";
}

function inferScholarshipType(lowerText) {
  const hasMerit = lowerText.includes("merit") || lowerText.includes("academic achievement");
  const hasNeed = lowerText.includes("need-based") || lowerText.includes("based on financial need") || lowerText.includes("demonstrated financial need");

  if (hasMerit && hasNeed) return "merit_plus_need";
  if (hasNeed) return "pure_need_based";
  return "pure_merit_based";
}

module.exports = {
  collectScholarshipClues
};
