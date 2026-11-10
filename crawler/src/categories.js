const CITIZENSHIP_VALUES = [
  "No Restriction",
  "U.S. Citizen",
  "Permanent Resident",
  "International Student"
];

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia", AS: "American Samoa", GU: "Guam", MP: "Northern Mariana Islands",
  PR: "Puerto Rico", VI: "U.S. Virgin Islands", NA: "Not Applicable"
};

const MAJOR_VALUES = [
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
  "Environmental Science",
  "Undeclared",
  "Other"
];

const REQUIREMENT_VALUES = ["not_considered", "preferred", "required"];

const RACE_VALUES = [
  "White/Caucasian",
  "Black or African American",
  "Asian",
  "Native American / Alaska Native",
  "Native Hawaiian / Pacific Islander",
  "Hispanic / Latino",
  "Middle Eastern / North African (MENA)",
  "Two or More Races / Multiracial",
  "Other",
  "Prefer Not to Say"
];

const SCHOLARSHIP_TYPE_VALUES = [
  "pure_merit_based",
  "pure_need_based",
  "merit_plus_need"
];

module.exports = {
  CITIZENSHIP_VALUES,
  MAJOR_VALUES,
  RACE_VALUES,
  REQUIREMENT_VALUES,
  SCHOLARSHIP_TYPE_VALUES,
  STATE_NAMES
};
