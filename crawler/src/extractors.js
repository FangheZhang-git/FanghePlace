const { MAJOR_VALUES, STATE_NAMES } = require("./categories");

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

function sentencesFromText(text) {
  return compactText(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])|\s+[|•]\s+|\n+/)
    .map(compactText)
    .filter(Boolean);
}

const ELIGIBILITY_TERMS = [
  "eligible", "eligibility", "must", "required", "requirements", "applicant",
  "candidate", "open to", "qualify", "qualification", "selection criteria",
  "preference", "preferred", "priority", "consideration", "considered"
];

function getEligibilityWindows(text, extraTerms = []) {
  const terms = [...ELIGIBILITY_TERMS, ...extraTerms].map((term) => term.toLowerCase());
  return sentencesFromText(text).filter((sentence) => {
    const lowerSentence = sentence.toLowerCase();
    return terms.some((term) => lowerSentence.includes(term));
  });
}

function addEvidence(evidence, field, value, excerpt, confidence = "high") {
  if (!excerpt) return;
  if (!evidence[field]) evidence[field] = [];
  evidence[field].push({
    value,
    excerpt: compactText(excerpt).slice(0, 500),
    source: "page_text",
    confidence
  });
}

function findMatchingSentence(sentences, patterns) {
  return sentences.find((sentence) => patterns.some((pattern) => pattern.test(sentence))) || "";
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
  const eligibilitySentences = getEligibilityWindows(text);
  const eligibilityText = eligibilitySentences.join(" ");
  const field_evidence = {};

  const amountNumbers = collectAwardAmounts(text, pageData.seedName || pageData.title);

  const gpaValue = firstMatch(eligibilityText, [
    /(?:minimum|min\.?|at least)\s+(?:unweighted\s+)?GPA(?:\s+of)?\s*([0-4](?:\.\d{1,2})?)/i,
    /([0-4](?:\.\d{1,2})?)\s+(?:minimum\s+)?GPA/i
  ]);

  const satValue = firstMatch(eligibilityText, [
    /(?:minimum|min\.?|at least)\s+SAT(?:\s+score)?(?:\s+of)?\s*(\d{3,4})/i,
    /SAT(?:\s+score)?(?:\s+of)?\s*(\d{3,4})/i
  ]);

  const actValue = firstMatch(eligibilityText, [
    /(?:minimum|min\.?|at least)\s+ACT(?:\s+score)?(?:\s+of)?\s*(\d{1,2})/i,
    /ACT(?:\s+score)?(?:\s+of)?\s*(\d{1,2})/i
  ]);

  const deadline = firstMatch(text, [
    /deadline(?:\s+is|\s*:)?\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /apply by\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /applications? (?:are )?due\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i
  ]);

  const applyLink = (pageData.links || []).find((link) => /\bapply\b|application portal|start application/i.test(`${link.text} ${link.href}`));
  const applyUrl = applyLink?.href || null;
  const citizenship = inferCitizenship(eligibilitySentences, field_evidence);
  const state = inferState(eligibilitySentences, field_evidence);
  const major = inferMajor(eligibilitySentences, field_evidence);
  const requiresEssay = inferEssayRequirement(eligibilitySentences, field_evidence);
  const firstGenOnly = inferFirstGenerationRequirement(eligibilitySentences, field_evidence);
  const leadership = inferSelectionLevel(eligibilitySentences, "leadership", field_evidence);
  const award = inferSelectionLevel(eligibilitySentences, "award", field_evidence);
  const renewable = inferRenewable(text, field_evidence);
  const advancedCoursework = inferAdvancedCoursework(eligibilitySentences, field_evidence);
  const income = inferIncome(eligibilitySentences, field_evidence);
  const race = inferRace(eligibilitySentences, field_evidence);
  const type = inferScholarshipType(lowerText, field_evidence, text);

  const academicEvidence = {
    min_gpa: findMatchingSentence(eligibilitySentences, [/\bGPA\b/i]),
    min_sat: findMatchingSentence(eligibilitySentences, [/\bSAT\b/i]),
    min_act: findMatchingSentence(eligibilitySentences, [/\bACT\b/i])
  };
  if (gpaValue) addEvidence(field_evidence, "min_gpa", parseFloat(gpaValue), academicEvidence.min_gpa);
  if (satValue) addEvidence(field_evidence, "min_sat", parseInt(satValue, 10), academicEvidence.min_sat);
  if (actValue) addEvidence(field_evidence, "min_act", parseInt(actValue, 10), academicEvidence.min_act);
  if (deadline) addEvidence(field_evidence, "deadline", deadline, findMatchingSentence(sentencesFromText(text), [/deadline/i, /apply by/i, /applications? (?:are )?due/i]));
  if (applyLink) addEvidence(field_evidence, "apply_url", applyUrl, `${applyLink.text || "Application link"}: ${applyUrl}`);

  return {
    crawl_index: pageData.crawlIndex,
    name: pageData.seedName || pageData.title || "Unknown",
    provider: inferProvider(pageData),
    min_amount: amountNumbers.length ? Math.min(...amountNumbers) : null,
    max_amount: amountNumbers.length ? Math.max(...amountNumbers) : null,
    min_gpa: gpaValue ? parseFloat(gpaValue) : null,
    min_sat: satValue ? parseInt(satValue, 10) : null,
    min_act: actValue ? parseInt(actValue, 10) : null,
    citizenship,
    state,
    major,
    requires_essay: requiresEssay,
    first_gen_only: firstGenOnly,
    leadership,
    min_income: income.min,
    max_income: income.max,
    renewable,
    description: text.slice(0, 1200) || "No description extracted",
    apply_url: applyUrl,
    deadline: deadline || null,
    advanced_coursework_preferred: advancedCoursework,
    award,
    race,
    type,
    source_url: pageData.url,
    source_text: text.slice(0, 5000),
    last_verified: new Date().toISOString(),
    confidence: "medium",
    extraction_status: "extracted",
    field_evidence
  };
}

function inferProvider(pageData) {
  try {
    const hostname = new URL(pageData.url).hostname.replace(/^www\./, "");
    return hostname;
  } catch (_error) {
    return null;
  }
}

function inferEssayRequirement(sentences, evidence) {
  const explicitNo = findMatchingSentence(sentences, [
    /\bno\s+(?:application\s+)?essay\s+(?:is\s+)?required\b/i,
    /\bessay(?:s)?\s+(?:is|are)\s+not\s+required\b/i,
    /\bwithout\s+(?:an\s+)?essay\b/i
  ]);
  if (explicitNo) {
    addEvidence(evidence, "requires_essay", 0, explicitNo);
    return 0;
  }

  const required = findMatchingSentence(sentences, [
    /\b(?:must|required to|need to)\b.{0,80}\b(?:submit|write|provide)\b.{0,50}\b(?:essay|personal statement|written response)\b/i,
    /\b(?:essay|personal statement|written response)\b.{0,40}\b(?:required|must be submitted)\b/i
  ]);
  if (required) {
    addEvidence(evidence, "requires_essay", 1, required);
    return 1;
  }
  return null;
}

function inferFirstGenerationRequirement(sentences, evidence) {
  const sentence = findMatchingSentence(sentences, [
    /\b(?:must be|only|limited to|eligible applicants? (?:are|must be))\b.{0,80}\bfirst[- ]generation\b/i,
    /\bfirst[- ]generation\b.{0,50}\b(?:required|only|eligible)\b/i
  ]);
  if (!sentence) return null;
  addEvidence(evidence, "first_gen_only", 1, sentence);
  return 1;
}

function inferCitizenship(sentences, evidence) {
  const lowerText = sentences.join(" ").toLowerCase();
  const candidates = [];
  if (/(?:must|eligible|required|applicant).{0,80}(?:u\.s\. citizens?|us citizens?|u\.s\. nationals?|united states citizens?)/i.test(lowerText)) candidates.push("U.S. Citizen");
  if (/(?:must|eligible|required|applicant).{0,80}permanent resident/i.test(lowerText)) candidates.push("Permanent Resident");
  if (/international students?.{0,40}(?:eligible|may apply)/i.test(lowerText) && !/international students?.{0,40}(?:not|ineligible|cannot)/i.test(lowerText)) candidates.push("International Student");

  if (candidates.length === 1) {
    const patterns = {
      "U.S. Citizen": /u\.s\. citizens?|us citizens?|u\.s\. nationals?|united states citizens?/i,
      "Permanent Resident": /permanent resident/i,
      "International Student": /international students?/i
    };
    addEvidence(evidence, "citizenship", candidates[0], findMatchingSentence(sentences, [patterns[candidates[0]]]));
    return candidates[0];
  }

  if (candidates.length > 1) {
    for (const candidate of candidates) {
      const patterns = {
        "U.S. Citizen": /u\.s\. citizens?|us citizens?|u\.s\. nationals?|united states citizens?/i,
        "Permanent Resident": /permanent resident/i,
        "International Student": /international students?/i
      };
      addEvidence(evidence, "citizenship", null, findMatchingSentence(sentences, [patterns[candidate]]), "low");
    }
  }

  const unrestricted = findMatchingSentence(sentences, [
    /\b(?:regardless of|no restriction on)\s+(?:citizenship|immigration status)\b/i,
    /\b(?:citizenship|immigration status)\s+(?:is\s+)?not required\b/i
  ]);
  if (unrestricted) {
    addEvidence(evidence, "citizenship", "No Restriction", unrestricted);
    return "No Restriction";
  }

  return null;
}

function inferState(sentences, evidence) {
  const candidates = [];
  for (const sentence of sentences) {
    if (!/\b(?:residents?|residency|live|living|attend(?:ing)? school|graduate(?:d|s)? from|state)\b/i.test(sentence)) continue;

    for (const [code, name] of Object.entries(STATE_NAMES)) {
      if (code === "NA") continue;
      const namePattern = new RegExp(`\\b${name.replace(/ /g, "\\s+")}\\b`, "i");
      const codePattern = new RegExp(`\\b${code}\\b`);
      if (namePattern.test(sentence) || codePattern.test(sentence)) {
        candidates.push({ code, sentence });
      }
    }
  }

  const uniqueCodes = [...new Set(candidates.map((candidate) => candidate.code))];
  if (uniqueCodes.length !== 1) {
    candidates.forEach((candidate) => addEvidence(evidence, "state", null, candidate.sentence, "low"));
    return null;
  }
  const match = candidates.find((candidate) => candidate.code === uniqueCodes[0]);
  addEvidence(evidence, "state", uniqueCodes[0], match.sentence);
  return uniqueCodes[0];
}

function inferMajor(sentences, evidence) {
  const scopedSentences = sentences.filter((sentence) => /\b(?:major|field of study|study in|degree in|discipline)\b/i.test(sentence));
  const scopedText = scopedSentences.join(" ").toLowerCase();
  if (!scopedText) return null;

  const matches = MAJOR_VALUES.filter((candidate) => !["Undeclared", "Other"].includes(candidate) && scopedText.includes(candidate.toLowerCase()));
  if (matches.length !== 1) {
    scopedSentences.forEach((sentence) => addEvidence(evidence, "major", null, sentence, "low"));
    return null;
  }
  const [major] = matches;
  addEvidence(evidence, "major", major, findMatchingSentence(scopedSentences, [new RegExp(major.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")]));
  return major;
}

function inferIncome(sentences, evidence) {
  const result = { min: null, max: null };
  const incomeSentences = sentences.filter((sentence) => /\b(?:household|family|annual) income\b/i.test(sentence));

  for (const sentence of incomeSentences) {
    const amountMatch = sentence.match(/\$[\d,]+/);
    const amount = amountToNumber(amountMatch?.[0]);
    if (amount === null || amount < 5000 || amount > 10000000) continue;

    if (/\b(?:at or below|below|under|less than|no more than|maximum|max(?:imum)? of|not exceed)\b/i.test(sentence)) {
      result.max = amount;
      addEvidence(evidence, "max_income", amount, sentence);
    } else if (/\b(?:at or above|above|over|greater than|at least|minimum|min(?:imum)? of)\b/i.test(sentence)) {
      result.min = amount;
      addEvidence(evidence, "min_income", amount, sentence);
    }
  }
  return result;
}

function inferRace(sentences, evidence) {
  const raceSentences = sentences.filter((sentence) => /\b(?:race|ethnicity|heritage|identify as|racial|ethnic|minority)\b/i.test(sentence));
  const lowerText = raceSentences.join(" ").toLowerCase();
  if (!lowerText) return null;

  const racePatterns = {
    "White/Caucasian": /\b(?:white|caucasian)\b/i,
    "Black or African American": /\b(?:black|african american)\b/i,
    Asian: /\basian\b/i,
    "Native American / Alaska Native": /\b(?:native american|alaska native)\b/i,
    "Native Hawaiian / Pacific Islander": /\b(?:native hawaiian|pacific islander)\b/i,
    "Hispanic / Latino": /\b(?:hispanic|latino|latina|latinx)\b/i,
    "Middle Eastern / North African (MENA)": /\b(?:middle eastern|north african|MENA)\b/i,
    "Two or More Races / Multiracial": /\b(?:multiracial|two or more races)\b/i
  };
  const matches = Object.entries(racePatterns).filter(([, pattern]) => pattern.test(lowerText));
  if (matches.length !== 1) {
    raceSentences.forEach((sentence) => addEvidence(evidence, "race", null, sentence, "low"));
    return null;
  }
  const [race, pattern] = matches[0];
  addEvidence(evidence, "race", race, findMatchingSentence(raceSentences, [pattern]));
  return race;
}

function inferSelectionLevel(sentences, field, evidence) {
  const terms = field === "leadership"
    ? /\b(?:leadership|leader|led)\b/i
    : /\b(?:academic awards?|honors?|achievements?|competition awards?)\b/i;
  const relevant = sentences.filter((sentence) => terms.test(sentence));
  const notConsidered = findMatchingSentence(relevant, [
    /\b(?:not considered|will not be considered|no consideration)\b/i
  ]);
  if (notConsidered) {
    addEvidence(evidence, field, "not_considered", notConsidered);
    return "not_considered";
  }

  const positiveRelevant = relevant.filter((sentence) => !/\b(?:not required|isn't required|is not required|no .{0,30} required)\b/i.test(sentence));
  const required = findMatchingSentence(positiveRelevant, [
    /\b(?:must|required|requirement|only)\b/i
  ]);
  if (required) {
    addEvidence(evidence, field, "required", required);
    return "required";
  }

  const preferred = findMatchingSentence(positiveRelevant, [
    /\b(?:preferred|preference|selection criteria|considered|demonstrate|strong|priority)\b/i
  ]);
  if (preferred) {
    addEvidence(evidence, field, "preferred", preferred);
    return "preferred";
  }
  return null;
}

function inferRenewable(text, evidence) {
  const sentences = sentencesFromText(text);
  const notRenewable = findMatchingSentence(sentences, [/\bnot renewable\b/i, /\bone[- ]time (?:award|scholarship)\b/i]);
  if (notRenewable) {
    addEvidence(evidence, "renewable", 0, notRenewable);
    return 0;
  }
  const renewable = findMatchingSentence(sentences, [/\brenewable\b/i, /\brenewed annually\b/i, /\brenew each year\b/i]);
  if (renewable) {
    addEvidence(evidence, "renewable", 1, renewable);
    return 1;
  }
  return null;
}

function inferAdvancedCoursework(sentences, evidence) {
  const sentence = findMatchingSentence(sentences, [
    /\b(?:advanced coursework|AP courses?|honors courses?|dual enrollment)\b.{0,80}\b(?:preferred|considered|priority)\b/i,
    /\b(?:preferred|considered|priority)\b.{0,80}\b(?:advanced coursework|AP courses?|honors courses?|dual enrollment)\b/i
  ]);
  if (!sentence) return null;
  addEvidence(evidence, "advanced_coursework_preferred", 1, sentence);
  return 1;
}

function inferScholarshipType(lowerText, evidence, text) {
  const hasMerit = lowerText.includes("merit") || lowerText.includes("academic achievement");
  const hasNeed = lowerText.includes("need-based") || lowerText.includes("based on financial need") || lowerText.includes("demonstrated financial need");

  let value = null;
  if (hasMerit && hasNeed) value = "merit_plus_need";
  else if (hasNeed) value = "pure_need_based";
  else if (hasMerit) value = "pure_merit_based";

  if (value) {
    addEvidence(evidence, "type", value, findMatchingSentence(sentencesFromText(text), [/merit/i, /financial need/i, /need-based/i]), "medium");
  }
  return value;
}

module.exports = {
  STATE_NAMES,
  collectScholarshipClues,
  getEligibilityWindows
};
