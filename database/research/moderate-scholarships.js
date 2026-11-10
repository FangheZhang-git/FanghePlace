// Manually researched September 2, 2026. Unknowns are deliberately null.
// User instruction overrides the older policy of estimating academic thresholds.
const fields = ['name', 'provider', 'min_amount', 'max_amount', 'min_gpa', 'min_sat',
    'min_act', 'citizenship', 'state', 'major', 'requires_essay', 'first_gen_only',
    'leadership', 'min_income', 'max_income', 'renewable', 'description', 'apply_url',
    'deadline', 'advanced_coursework_preferred', 'award', 'race', 'type'];

function source(url, kind = 'official') { return { url, kind }; }
function entry(values, details) {
    const row = Object.fromEntries(fields.map(field => [field, null]));
    Object.assign(row, values);
    const research = {
        checked_on: '2026-09-02',
        academic_scope: 'High-school applicant unless otherwise stated',
        gpa_notes: 'No numerical minimum found in the reviewed requirements; unknown, not zero.',
        sat_notes: 'No published minimum or explicit waiver found; left blank.',
        act_notes: 'No published minimum or explicit waiver found; left blank.',
        accepted_applicant_gpa: null, accepted_applicant_sat: null, accepted_applicant_act: null,
        acceptance_rate: null,
        opens_on: null, closes_on: row.deadline, cycle_status: 'open',
        cycle_notes: '', award_basis: 'Per award',
        citizenship_notes: null, residency_notes: null, renewal_notes: null,
        requirements: [], materials: [], selection: [],
        manual_checks: ['Confirm student level and enrollment with the provider.'],
        rules: {},
        reputation: '', experiences: [],
        sources: [source(row.apply_url)],
        ...details
    };
    // Each value is traceable to reviewed sources, not an inferred applicant cutoff.
    research.field_sources = Object.fromEntries(fields.filter(f => row[f] !== null)
        .map(f => [f, research.sources.filter(s => s.kind === 'official').map(s => s.url)]));
    research.unknown_fields = fields.filter(f => row[f] === null);
    return { ...row, research };
}

const scholarships = [
    entry({name:'AES Engineering Scholarship', provider:'AES Engineering', min_amount:500, max_amount:500,
        requires_essay:1, major:'any', deadline:'2026-10-08',
        apply_url:'https://www.aesengineers.com/scholarships.php',
        description:'A $500 character-based essay award for high school seniors and postsecondary students in any field. Engineering study is not required. Submit an original 500–1,000-word essay about future success, relationships, and accomplishments. No numerical GPA, SAT, or ACT cutoff is published.'}, {
        requirements:['High school senior or student attending a postsecondary educational institution.','Engineering courses are not required.'],
        materials:['500–1,000-word original essay, emailed with name, current school and plans for next year.','AI-generated applications are not accepted.'],
        selection:['Character assessed through the essay.'],
        reputation:'Provider publishes named recipients spanning many years. Independent payment verification and a reliable firsthand applicant account were not located; school listings alone do not establish payment.',
        experiences:[{kind:'provider_published',text:'The 2025 list includes Cadence Kelly (health science) and Rylee Smith (engineering). These biographies publish no GPA or SAT/ACT data.',url:'https://www.aesengineers.com/scholarships.php'}],
        sources:[source('https://www.aesengineers.com/scholarships.php'),source('https://aesengineers.com/scholarshiprecipients.php')]
    }),
    entry({name:'Abbott & Fenner Scholarship',provider:'Abbott & Fenner Business Consultants',min_amount:1000,max_amount:1000,
        requires_essay:1,deadline:'2027-06-10',apply_url:'https://abbottandfenner.com/scholarships.php',
        description:'A $1,000 essay scholarship for high school juniors, seniors and students registered at accredited postsecondary institutions. Submit 500–1,000 original words about education, career and life goals. Academic cutoffs are not published. Applicant reports about communication are mixed; read the research notes.'}, {
        requirements:['High school junior or senior, or currently registered at an accredited postsecondary institution.'],
        materials:['500–1,000-word essay emailed with full name, mailing address and current school.','AI-generated essays are not accepted.'],
        selection:['Educational, career and life-goal essay.'],
        reputation:'Mixed, unverified community reports. A 2020 Reddit thread contains concerns and a commenter claiming they received a check. A 2024 thread describes deadline and notification confusion. These anecdotes do not prove fraud or independently verify payment.',
        experiences:[{kind:'anonymous_anecdote',text:'Applicants in 2024 reported checking the website for outcomes rather than receiving a rejection email.',url:'https://www.reddit.com/r/scholarships/comments/1dm7hgi/abbott_and_fenner_scholarship/'},
            {kind:'anonymous_anecdote',text:'A commenter in a 2020 discussion claims receipt of a scholarship check; identity and payment were not independently verified.',url:'https://www.reddit.com/r/scholarships/comments/gw3ao3/'},
            {kind:'provider_published',text:'The 2026 recipient list includes Janelle Thomas, pursuing culinary arts at a community college. No recipient academic statistics are provided.',url:'https://abbottandfenner.com/scholarships.php'}],
        sources:[source('https://abbottandfenner.com/scholarships.php'),source('https://www.reddit.com/r/scholarships/comments/gw3ao3/','anonymous_anecdote'),source('https://www.reddit.com/r/scholarships/comments/1dm7hgi/abbott_and_fenner_scholarship/','anonymous_anecdote')]
    }),
    entry({name:'Gen and Kelly Tanabe Scholarship',provider:'Gen and Kelly Tanabe',min_amount:1000,max_amount:1000,min_gpa:0,min_sat:0,min_act:0,
        requires_essay:1,type:'pure_merit_based',deadline:'2026-12-31',apply_url:'https://www.genkellyscholarship.com/scholarship-details',
        description:'A $1,000 personal-statement scholarship for U.S. legal residents in grades 9–12, college or graduate school, including adult learners. The provider explicitly does not consider grades, standardized tests or financial need. Selection is primarily based on the personal statement; broad eligibility does not establish easy winning odds.'}, {
        gpa_notes:'Grades are explicitly not considered.',sat_notes:'Standardized test scores are explicitly not considered.',act_notes:'Standardized test scores are explicitly not considered.',
        citizenship_notes:'Legal U.S. resident; not equivalent to a U.S.-citizen-only requirement.',
        requirements:['Grades 9–12, college or graduate student, including adult learners.','Legal resident of the U.S.; currently in school or planning college/graduate school.'],
        materials:['Online application and personal statement.'],selection:['Independent judging panel; primarily personal statement. Financial need and academic performance are not considered.'],
        reputation:'Provider describes awards beginning in 2001. An older Reddit thread questions related scholarship sites and marketing practices; those allegations are unverified. No independently verified recipient payment or accepted-applicant academic profile was located.',
        sources:[source('https://www.genkellyscholarship.com/scholarship-details'),source('https://www.genkellyscholarship.com/about'),source('https://www.genkellyscholarship.com/application-status'),source('https://www.reddit.com/r/scholarships/comments/61aggy/gen_kelly_tanabe_scholarship_a_scam_gen_seems_to/','anonymous_anecdote')],
        manual_checks:['Confirm legal U.S. residency and current/planned student enrollment.']
    }),
    entry({name:'College JumpStart Show Grit Scholarship',provider:'College JumpStart Scholarship',min_amount:1000,max_amount:1000,min_gpa:0,min_sat:0,min_act:0,
        requires_essay:1,type:'pure_merit_based',deadline:'2027-03-31',apply_url:'https://www.jumpstart-scholarship.net/application-show-grit-scholarship',
        description:'A $1,000 personal-statement award about perseverance. Open to grades 10–12, college students, or applicants planning college within 12 months who are U.S. citizens or legal residents. Grades, test scores and financial need are explicitly not considered. The statement is limited to 250 words.'}, {
        gpa_notes:'Grades are explicitly not considered.',sat_notes:'Test scores are explicitly not considered.',act_notes:'Test scores are explicitly not considered.',
        citizenship_notes:'U.S. citizen or legal resident.',
        requirements:['Grades 10–12 or college, or planning to enter college within 12 months.','Accredited U.S. college, community college, vocational/trade school or qualifying online program.'],
        materials:['Online application and personal statement of 250 words or fewer.'],selection:['Content of personal statement, rather than writing style.'],
        reputation:'The umbrella JumpStart program publishes winner names and essay excerpts. Older winners are not proof of outcomes for the newly named Show Grit round. Independent payment verification was not located.',
        experiences:[{kind:'provider_published',text:'The umbrella program lists Jaslie Fang as a summer 2025 winner and Olivia Garcia as a spring 2025 winner. Published material focuses on personal stories, not test scores.',url:'https://www.jumpstart-scholarship.net/winners'}],
        sources:[source('https://www.jumpstart-scholarship.net/application-show-grit-scholarship'),source('https://www.jumpstart-scholarship.net/faq'),source('https://www.jumpstart-scholarship.net/winners')],
        manual_checks:['Confirm grade/student level, U.S. residency and enrollment timing.']
    }),
    ...[
        ['Don’t Text and Drive Scholarship','dont-text-and-drive-scholarship','2026-09-30','texting while driving','Donna Brennan, a Walden University student, is listed as the 2024 winner. Her published statement discusses witnessing crash consequences as a nurse.'],
        ['Digital Privacy Scholarship','digital-privacy-scholarship','2027-06-30','responsible management of an online profile','Tianna Benson of the University of Louisville is listed as the June 2025 winner. Her statement emphasizes a positive online presence and mental-health awareness.']
    ].map(([name,slug,deadline,topic,experience]) => entry({name,provider:'Digital Responsibility',min_amount:1000,max_amount:1000,requires_essay:1,deadline,
        apply_url:`https://www.digitalresponsibility.org/${slug}`,
        description:`A $1,000 awareness scholarship about ${topic} for high school, college and graduate students, including homeschoolers, who are U.S. citizens or legal residents. The initial application uses a short statement. No numerical GPA, SAT or ACT minimum was found. See sources and communication caveats before applying.`}, {
        citizenship_notes:'U.S. citizen or legal resident.',requirements:['High school freshman through senior, or current/entering college or graduate student. Homeschoolers eligible.'],
        materials:['Online application with a 140-character statement. Secondary listings describe a longer finalist essay; confirm current finalist instructions with the provider.'],
        selection:['Judging panel; scholarship awareness statement.'],
        reputation:'Provider now publishes named winners and statements. Older Reddit posts report failed email contacts and question transparency; the older assertion that no winners are listed is no longer current. Payment and anonymous claims were not independently verified.',
        experiences:[{kind:'provider_published',text:experience+' No academic scores are given.',url:'https://www.digitalresponsibility.org/scholarship-winners'}],
        sources:[source(`https://www.digitalresponsibility.org/${slug}`),source('https://www.digitalresponsibility.org/scholarships'),source('https://www.digitalresponsibility.org/scholarship-winners'),source('https://www.reddit.com/r/scholarships/comments/it8sg6/digital_responsibility_anyone_know_anything_about/','anonymous_anecdote')],
        manual_checks:['Confirm current student status, legal U.S. residency, and any finalist instructions.']
    })),
    entry({name:'Unigo Education Matters Scholarship',provider:'Unigo',min_amount:5000,max_amount:5000,requires_essay:1,renewable:0,
        deadline:'2026-11-30',apply_url:'https://www.unigo.com/our-scholarships/education-matters-scholarship',
        description:'One $5,000 award for an eligible U.S. legal resident age 14 or older. Submit up to 250 words explaining the value of education. Residence in the 50 states or D.C. and the official postsecondary enrollment conditions apply. No numerical GPA or SAT/ACT threshold is published; one national winner means broad competition.'}, {
        citizenship_notes:'Legal U.S. resident.',residency_notes:'50 United States or District of Columbia.',
        requirements:['Age 14 or older.','Legal U.S. resident in the 50 states or D.C.','Meet the official rules for current or future accredited postsecondary enrollment.'],
        materials:['Online entry and response of 250 words or fewer.'],selection:['Written response judged under the contest rules. One recipient.'],
        reputation:'Established scholarship platform with published past winning essays. Public discussions question delays in posting newer winners; older examples do not independently verify the current round. No reliable acceptance rate found.',
        experiences:[{kind:'provider_published',text:'The provider publishes a 2021 winning response discussing education’s value. A winning essay is evidence of selection style, not a GPA/SAT cutoff.',url:'https://www.unigo.com/pay-for-college/scholarship/2021-unigo-education-matters-scholarship-winner'}],
        sources:[source('https://www.unigo.com/?p=15095'),source('https://www.unigo.com/pay-for-college/scholarship/2021-unigo-education-matters-scholarship-winner'),source('https://www.reddit.com/r/scholarships/comments/1q0f86w/are_unigo_scholarships_still_active_the_ones_ive/','anonymous_anecdote')],
        manual_checks:['Confirm age, residency and the enrollment deadline in current official rules.']
    }),
    entry({name:'BigSun Scholarship',provider:'BigSun Athletics',min_amount:500,max_amount:500,requires_essay:1,
        deadline:'2027-06-19',apply_url:'https://www.bigsunathletics.com/',
        description:'A $500 essay award for high school senior or postsecondary student athletes. All sports and participation capacities are eligible. Submit 500–1,000 original words about how sports affected your life. No numerical academic cutoff is published; this is not a college athletic recruiting award.'}, {
        requirements:['High school senior or student at a postsecondary institution.','Student athlete, regardless of sport or participation capacity.'],
        materials:['500–1,000-word original essay emailed with name and school. AI-generated essays not accepted.'],
        selection:['Essay discussing sports, career goals and family relationships. Number of awards varies.'],
        reputation:'Provider lists multiple named recipients, including 2026 winners. Searches mostly returned listings rather than firsthand accounts; independent payment verification was not found.',
        experiences:[{kind:'provider_published',text:'The 2026 winners include Izellah Price (equine studies), Lindsay Tylec (sports management), and Ana Amador (early childhood education). No GPA or test scores are published.',url:'https://www.bigsunathletics.com/'}],
        manual_checks:['Confirm student-athlete participation and eligible student level.']
    }),
    entry({name:'Optimist International Essay Contest',provider:'Optimist International',min_amount:2500,max_amount:2500,requires_essay:1,
        apply_url:'https://optimist.org/member/scholarships3.cfm',
        description:'A local-to-district essay competition with a $2,500 district college scholarship. Entrants must be under 19 on October 1 of the contest year and not have completed high school or equivalent. Enter through a local Optimist Club. Local deadlines and smaller local prizes vary; no GPA or SAT/ACT cutoff is published.'}, {
        cycle_status:'upcoming',opens_on:'2026-10-01',cycle_notes:'2026–27 topic published. Contact the sponsoring club from October 1; local deadlines vary and club contests finish by early February.',
        award_basis:'District scholarship; local prizes differ and are not the $2,500 award.',
        requirements:['Under 19 on October 1 of the contest year; not completed high school/equivalent.','Enter through the district of residence and a sponsoring local club.'],
        materials:['Essay on the current topic and club application.'],selection:['Club judging followed by district competition.'],
        reputation:'Established service organization with identifiable local award ceremonies. Local competition results should not be confused with district scholarship wins or national acceptance rates.',
        experiences:[{kind:'provider_published',text:'Van Wert’s 2026 club report names Meah Johnson as its first-place winner among 46 entries; her essay advanced to district judging. This is a local outcome, not a district scholarship win.',url:'https://optimistvw.com/2026-essay-contest-winners'}],
        sources:[source('https://optimist.org/member/scholarships3.cfm'),source('https://optimistvw.com/2026-essay-contest-winners')],
        manual_checks:['Confirm age, school completion status, local sponsoring club and local deadline.']
    }),
    entry({name:'SparkForce Manufacturing Scholarship',provider:'SparkForce, The FMA Foundation',max_amount:2000,min_gpa:2.5,
        deadline:'2026-10-01',apply_url:'https://www.fmamfg.org/foundation/scholarships',
        description:'Up to $2,000 per semester for approved manufacturing degrees or certificates. Minimum GPA is 2.5 for community/trade/technical college or 3.0 for university. Full-time study, or at least six credits while working, is required. The October deadline funds spring 2027; verify enrollment timing and the approved program list.'}, {
        gpa_notes:'Conditional minimum: 2.5 community/trade/technical college; 3.0 university. Stored floor is 2.5, not a universal qualification.',
        award_basis:'Up to $2,000 per semester; minimum award not established.',
        opens_on:'2026-07-01',cycle_notes:'Current deadline funds spring 2027. Fall 2027 application dates were not verified.',
        requirements:['Approved manufacturing-related degree/certification during the funded semester.','12+ credits full-time, or 6+ credits while working.','2.5 GPA at community/trade/technical college; 3.0 at university.'],
        materials:['Online application and transcript from most recent completed semester.','Recipients submit acceptance, photo release and activate a complimentary student FMA membership.'],
        selection:['Application and academic/program eligibility.'],
        reputation:'Recipient awards are corroborated by a college news report, beyond the provider’s own website. Prior Nuts, Bolts & Thingamajigs awards belong to the renamed foundation; award amounts must use current rules.',
        experiences:[{kind:'institution_report',text:'Pennsylvania College of Technology reported student manufacturing scholarship awards in July 2025 and described strong academic/technical performance. It did not give an accepted GPA or SAT distribution.',url:'https://www.pct.edu/news/articles/2025/07/15/penn-college-students-lead-in-manufacturing-scholarships'}],
        sources:[source('https://www.fmamfg.org/foundation/scholarships'),source('https://www.fmamfg.org/foundation/scholarships/requirements'),source('https://www.fmamfg.org/foundation/scholarships/eligibility-fields-of-study-nbt-scholarships'),source('https://www.pct.edu/news/articles/2025/07/15/penn-college-students-lead-in-manufacturing-scholarships','institution_report')],
        manual_checks:['Confirm school type and its GPA threshold, approved program, credits/work status and spring 2027 enrollment.']
    }),
    entry({name:'AGC Workforce Development Scholarship',provider:'AGC Education and Research Foundation',min_amount:1000,max_amount:1000,renewable:1,
        apply_url:'https://www.agc.org/learn/education-and-research-foundation/scholarship-program',
        description:'$1,000 annually, renewable for up to two years, for approved construction craft or technical education. High school seniors can apply; full- and part-time study are eligible. U.S. citizenship or documented permanent residency is required. This is the Workforce Development program, separate from AGC’s undergraduate engineering scholarships.'}, {
        opens_on:'2027-03-01',cycle_status:'upcoming',cycle_notes:'Next opening March 1, 2027. Published recurring application window is March 1–June 1; a cycle-specific closing date is not yet verified.',
        award_basis:'$1,000 per year; up to two years under renewal rules.',renewal_notes:'Renewable for up to two years; confirm continuing eligibility.',
        citizenship_notes:'U.S. citizen or documented permanent resident.',rules:{citizenship:['U.S. Citizen','Permanent Resident']},
        requirements:['Planning approved technical school/craft training for a construction career.','Approved accredited degree, certificate, credential or registered apprenticeship.','Full- or part-time; high school seniors eligible.'],
        materials:['Online application, instructor/employer evaluation and latest transcript.'],
        reputation:'Established industry foundation. NCCER, a program partner, separately reports Workforce Development recipients. Do not substitute experiences from AGC’s different university scholarship programs.',
        experiences:[{kind:'partner_report',text:'NCCER publicly recognized the 2021 Workforce Development award recipients. No accepted-applicant GPA or test-score distribution was reported.',url:'https://www.nccer.org/newsroom/nccer-and-byf-congratulate-the-2021-agc-workforce-development-scholarship-recipients/'}],
        sources:[source('https://www.agc.org/learn/education-and-research-foundation/scholarship-program'),source('https://www.agc.org/sites/default/files/Files/Foundation/Workforce%20Development%20Criteria.pdf'),source('https://www.nccer.org/newsroom/nccer-and-byf-congratulate-the-2021-agc-workforce-development-scholarship-recipients/','partner_report')],
        manual_checks:['Confirm citizenship, approved construction program, enrollment and current deadline.']
    }),
    entry({name:'AmericanMuscle Automotive Scholarship',provider:'AmericanMuscle / Turn5',min_amount:2500,max_amount:2500,requires_essay:1,renewable:0,
        deadline:'2026-10-15',apply_url:'https://www.americanmuscle.com/scholarships.html',
        description:'One $2,500 automotive-study scholarship each spring and fall. High school seniors entering postsecondary education and eligible full-time students may apply with enrollment evidence and a 700–1,500-word essay. The October 15 noon deadline funds spring; the June 15 deadline funds fall. No GPA or SAT/ACT cutoff is published.'}, {
        cycle_notes:'Spring deadline October 15 at noon, stated as EST by provider. Confirm timezone. Fall recurring deadline June 15.',
        renewal_notes:'Nonrenewable; prior winners may apply again with a new essay.',
        requirements:['Automotive degree or related field.','Eligible full-time postsecondary student or high school senior planning postsecondary enrollment.'],
        materials:['Enrollment evidence and 700–1,500-word essay in PDF or Word format.'],selection:['Essay about using automotive education for innovation and positive industry change.'],
        reputation:'Named recipients and parent-company award announcements exist. Secondary car-club coverage reproduces a sponsor announcement rather than independently auditing payments. Provider wording conflicts over U.S./Canadian institutions; confirm school eligibility.',
        experiences:[{kind:'reprinted_provider_release',text:'A spring 2021 Turn5 announcement describes an automotive recipient’s interest in an all-electric muscle car. No GPA or test scores are reported.',url:'https://www.carsandracingstuff.com/library/articles/46421.php'}],
        sources:[source('https://www.americanmuscle.com/scholarships.html'),source('https://www.carsandracingstuff.com/library/articles/46421.php','reprinted_provider_release')],
        manual_checks:['Confirm automotive program, enrollment evidence, institution eligibility and semester.']
    }),
    entry({name:'AmericanTrucks Student Scholarship',provider:'AmericanTrucks / Turn5',min_amount:2500,max_amount:2500,requires_essay:1,renewable:0,
        deadline:'2026-10-15',apply_url:'https://www.americantrucks.com/scholarships.html',
        description:'One $2,500 award each spring and fall for eligible building-trades or construction-management education, including technical and apprenticeship programs. High school students entering an eligible program can apply. Requires enrollment evidence and a 750–1,500-word essay. No numerical GPA or SAT/ACT cutoff is published.'}, {
        cycle_notes:'October 15 at noon for spring; June 15 at noon for fall. Provider does not clearly state a timezone on this page.',
        renewal_notes:'Nonrenewable; previous winners may reapply with a new essay.',
        requirements:['Eligible accredited U.S. building-trades, construction-management, vocational, technical or tuition-bearing apprenticeship program.','Current eligible full-time student, or high school student entering an eligible program the following academic year.'],
        materials:['Enrollment evidence and 750–1,500-word essay in PDF or Word format.'],
        selection:['Essay about contribution to the community of skilled trade workers.'],
        reputation:'Parent-company announcements name recipients, with secondary republication. Independent payment verification was not located.',
        experiences:[{kind:'reprinted_provider_release',text:'The spring 2021 Turn5 announcement names Andrew Pankratz as the AmericanTrucks $2,500 recipient. No academic statistics are published.',url:'https://www.carsandracingstuff.com/library/articles/46421.php'}],
        sources:[source('https://www.americantrucks.com/scholarships.html'),source('https://www.carsandracingstuff.com/library/articles/46421.php','reprinted_provider_release')],
        manual_checks:['Confirm eligible building-trades program, enrollment and semester.']
    }),
    entry({name:'Jimmy Rane Foundation Scholarship',provider:'Jimmy Rane Foundation',min_amount:500,max_amount:6000,min_gpa:3,min_sat:0,min_act:0,requires_essay:1,renewable:1,
        type:'merit_plus_need',deadline:'2027-02-05',apply_url:'https://www.jimmyranefoundation.org/scholarship-faqs',
        description:'$500–$6,000 per year, renewable up to four academic years, with financial need considered. High school GPA minimum is 3.0; college freshmen/sophomores use 2.75. No SAT or ACT minimum. Age, eligible-state residence, citizenship and enrollment rules apply. Application opens December 1; recommendations have a separate deadline.'}, {
        gpa_notes:'3.0 for high school applicants; 2.75 for current college applicants.',sat_notes:'Provider explicitly states no SAT minimum; scores may still be submitted.',act_notes:'Provider explicitly states no ACT minimum; scores may still be submitted.',
        opens_on:'2026-12-01',cycle_status:'upcoming',cycle_notes:'Application February 5, 2027; recommendations February 10, 2027.',
        award_basis:'Per year; up to four academic years/eight semesters.',renewal_notes:'Annual renewal subject to continuing requirements.',
        citizenship_notes:'U.S. citizen, or permanent resident holding a card and in the process of becoming a citizen.',
        residency_notes:'AL, AR, DE, FL, GA, IL, IN, IA, KS, KY, LA, MD, MS, MO, NE, NJ, NY, NC, OH, OK, PA, SC, TN, TX, VA, WV, DC.',
        rules:{states:['AL','AR','DE','FL','GA','IL','IN','IA','KS','KY','LA','MD','MS','MO','NE','NJ','NY','NC','OH','OK','PA','SC','TN','TX','VA','WV','DC'],citizenship:['U.S. Citizen','Permanent Resident']},
        requirements:['Eligible graduating senior/GED recipient or college freshman/sophomore; no older than 20 on August 1, 2027.','Financial need considered; no numerical income ceiling published.','Meet foundation enrollment and other program rules.'],
        materials:['Online application, supplemental documentation, essays and recommendations; confirm current forms when opened.'],
        reputation:'Established foundation with a published application administrator (ISTS). April 2026 Reddit reports describe winner phone calls, consistent with the provider’s notification process; anonymous reports are not independently verified.',
        experiences:[{kind:'anonymous_anecdote',text:'An April 18, 2026 commenter reports that their student received a winner phone call. Older applicants discuss substantial essays and documentation; these do not establish current essay lengths or acceptance odds.',url:'https://www.reddit.com/r/scholarships/comments/1skx8j0/jimmy_rane_scholarship/'}],
        sources:[source('https://www.jimmyranefoundation.org/scholarship-faqs'),source('https://www.reddit.com/r/scholarships/comments/1skx8j0/jimmy_rane_scholarship/','anonymous_anecdote'),source('https://www.reddit.com/r/scholarships/comments/f706ew/','anonymous_anecdote')],
        manual_checks:['Confirm age, high-school/college category, eligible state, naturalization condition if applicable, enrollment and financial need.']
    }),
    entry({name:'Fisher House Scholarships for Military Children',provider:'Fisher House Foundation',min_amount:2000,max_amount:2000,min_gpa:3,requires_essay:1,
        apply_url:'https://www.fisherhouse.org/programs/scholarship-programs/scholarships-for-military-children/',
        description:'500 awards of $2,000 for 2027–28 for eligible unmarried military dependents under 23 with valid USID. High school applicants need 3.0 GPA; current college applicants need 2.5. Full-time undergraduate enrollment and a 500-word essay are required. Applications reopen December 2026; the closing date is not yet verified.'}, {
        gpa_notes:'3.0 unweighted high school; 2.5 college. College freshmen submit first-semester college transcript.',
        cycle_status:'upcoming',cycle_notes:'Opens December 2026; exact opening and closing days not yet verified.',
        requirements:['Unmarried dependent under 23 with valid Uniformed Services ID.','Sponsor is eligible active-duty, reserve/guard, retired or deceased service member.','Full-time bachelor’s study or community/junior college leading directly to a four-year program.'],
        materials:['Student completes application, 500-word essay, transcript and military-dependent validation.'],
        selection:['Academics, school/community/volunteer activities, work experience and essay; commissary-based allocation.'],
        reputation:'Established military-family nonprofit with public recipient results and detailed payment procedures. Reddit search mostly returned announcements or other military programs, not a verifiable firsthand experience for this exact award.',
        experiences:[{kind:'provider_process',text:'Provider says checks payable to the school are sent to the recipient, who forwards them to the school. This is a published process, not a personal testimonial.',url:'https://www.fisherhouse.org/programs/scholarship-programs/scholarships-for-military-children/details/'}],
        sources:[source('https://www.fisherhouse.org/programs/scholarship-programs/scholarships-for-military-children/'),source('https://www.fisherhouse.org/programs/scholarship-programs/scholarships-for-military-children/details/'),source('https://www.fisherhouse.org/programs/scholarship-programs/scholarships-for-military-children/faq/')],
        manual_checks:['Confirm military dependency, ID, age, unmarried status, enrollment and other-award restrictions.']
    }),
    entry({name:'FEEA Scholarship',provider:'Federal Employee Education & Assistance Fund',min_amount:1000,max_amount:5000,min_gpa:3,requires_essay:1,renewable:0,type:'pure_merit_based',
        apply_url:'https://feea.org/our-programs/scholarships/',
        description:'$1,000–$5,000 merit awards for qualifying federal civilian/postal employees and eligible family members. Minimum cumulative unweighted GPA is 3.0. Employment/service history and dependent enrollment rules apply. The 2026 application closed March 12; the next deadline is not published. SAT/ACT cutoffs were not found.'}, {
        gpa_notes:'3.0 cumulative unweighted GPA, explicitly required in the 2026 instructions.',cycle_status:'closed',cycle_notes:'Last verified deadline: March 12, 2026 at 3 p.m. EDT. Next cycle not announced.',
        renewal_notes:'Not renewable; applicants may reapply in later eligible years.',
        requirements:['Qualifying permanent federal civilian/postal employee or eligible dependent/spouse. General sponsor rule: more than three years of federal employment by deadline.','Dependent applicants under 25 and full-time in an accredited degree program; partner-program exceptions must be checked.'],
        materials:['Transcript, employment proof (SF-50/PS-50), up to 500-word essay, activities and awards. Redact sensitive identifiers per instructions.'],
        selection:['Merit-based; academics and application record.'],
        reputation:'Longstanding nonprofit with partner confirmation of awards. Federal Managers Association reported its 2025 award through FEEA; this corroborates a specific partner award, not every scholarship payment.',
        experiences:[{kind:'partner_report',text:'Federal Managers Association named Kennan Herod-Vidal as its 2025 FEEA-administered scholarship recipient, entering computer engineering at UT Dallas. No SAT/ACT profile was published.',url:'https://www.fedmanagers.org/fma/files/cclibraryfiles/filename/000000002417/The%20Federal%20Manager%20_%20Fall%202025.pdf'}],
        sources:[source('https://feea.org/our-programs/scholarships/'),source('https://feea.org/wp-content/uploads/2025/11/Schol-Instructions-2026-FINAL.pdf'),source('https://www.fedmanagers.org/fma/files/cclibraryfiles/filename/000000002417/The%20Federal%20Manager%20_%20Fall%202025.pdf','partner_report')],
        manual_checks:['Confirm qualifying family relationship, federal service, age, full-time enrollment and next application cycle.']
    }),
    entry({name:'Elks National Foundation Legacy Awards',provider:'Elks National Foundation',min_amount:4000,max_amount:4000,min_sat:0,min_act:0,
        deadline:'2027-02-01',apply_url:'https://www.elks.org/scholars/scholarships/Legacy.cfm',
        description:'$4,000 Legacy Awards for qualifying high school senior children or grandchildren of living Elks members. Membership date and dues rules apply; great-grandchildren are ineligible. SAT and ACT submission is waived for 2027. Recipients must complete service with an Elks Lodge at least three times during college. Deadline is 11:59 a.m. Pacific.'}, {
        sat_notes:'SAT submission waived for the 2027 Legacy contest.',act_notes:'ACT submission waived for the 2027 Legacy contest.',
        opens_on:'2026-09-01',cycle_notes:'February 1, 2027 at 11:59 a.m. Pacific (daytime).',
        requirements:['High school senior; eligible child/grandchild, including qualifying step-relations/legal wards, of a living Elk.','Sponsor joined by April 1, 2024, or meets newer-lodge charter exception; paid-up membership rules apply.','Approved school rules, including listed geographic exceptions.'],
        materials:['Online application and membership verification; consult current portal for all supporting materials.'],
        reputation:'Established national foundation publishes recipient lists and state allocations. Reddit results were mostly award listings and unrelated Most Valuable Student discussions; they are not Legacy applicant experiences.',
        experiences:[{kind:'provider_published',text:'The official Legacy page links 2026 recipients and publishes 2027 state allocations. No reliable accepted-applicant score distribution was found.',url:'https://www.elks.org/scholars/scholarships/Legacy.cfm'}],
        sources:[source('https://www.elks.org/scholars/scholarships/Legacy.cfm'),source('https://elksreno.org/about/scholarships/')],
        manual_checks:['Confirm exact Elks family relationship, sponsor membership dates/dues, school rules and college service obligation.']
    }),
    entry({name:'Sertoma Hard of Hearing or Deaf Scholarship',provider:'Sertoma',min_amount:1000,max_amount:1000,min_gpa:3.2,citizenship:'U.S. Citizen',
        deadline:'2027-03-31',apply_url:'https://www.sertoma.org/what-we-do/scholarships',
        description:'A $1,000 scholarship for U.S. citizens with at least 40 dB bilateral hearing loss who pursue a full-time bachelor’s degree in the U.S. Requires 3.2 cumulative unweighted GPA. Graduating high school seniors may apply. Community-college, associate, vocational and graduate programs are excluded. SAT/ACT cutoffs are not published.'}, {
        gpa_notes:'3.2 cumulative unweighted GPA. Seniors include grades 9–11 and first semester of grade 12.',
        opens_on:'2026-11-01',cycle_status:'upcoming',cycle_notes:'Annual November 1–March 31 window; current page references 2027–28 funding.',
        requirements:['At least 40 dB bilateral hearing loss documented by audiogram SRT/PTA.','U.S. citizen; full-time U.S. bachelor’s degree.','No associate, community-college, vocational or graduate programs.'],
        materials:['Audiogram and academic records; confirm full current application packet when opened.'],
        reputation:'Established service organization publishes named recipient stories. These testimonials are provider-selected, not independent reviews.',
        experiences:[{kind:'provider_published',text:'A June 2025 story identifies Angelo (A.J.) Zirilli, studying sports management at Temple University, and describes the scholarship’s support while living with profound hearing loss.',url:'https://www.sertoma.org/News-Stories/View/ArticleId/12111/Sertoma-Scholarship-Helps-Open-Doors-for-Temple-University-Freshman'}],
        sources:[source('https://www.sertoma.org/what-we-do/scholarships'),source('https://www.sertoma.org/Portals/SERTOMA/TRIFOLD%20updated%202023.pdf'),source('https://www.sertoma.org/News-Stories/View/ArticleId/12111/Sertoma-Scholarship-Helps-Open-Doors-for-Temple-University-Freshman')],
        manual_checks:['Confirm documented bilateral hearing loss, full-time bachelor’s enrollment and unweighted GPA.']
    }),
    entry({name:'Cancer for College Scholarship',provider:'Cancer for College',min_amount:5000,max_amount:5000,renewable:0,
        apply_url:'https://cancerforcollege.org/application-faqs/',
        description:'Most general Cancer for College awards are $5,000; specialty awards and adjustments differ. Applicants must have personally been diagnosed with cancer and attend an accredited U.S. program. Family adjusted gross income must not exceed $150,000. Undergraduate students attend full-time. No numerical GPA or SAT/ACT cutoff was found.'}, {
        award_basis:'Typical general award. May be reduced when eligible costs are lower; specialty awards may be higher.',
        cycle_status:'upcoming',cycle_notes:'Annual November 1–January 31 application window; provider directs applicants to 2027–28. Exact cycle dates should be reconfirmed.',
        renewal_notes:'Students can reapply each year; no automatic renewal promised.',
        requirements:['Personal cancer diagnosis.','Accredited U.S. college, university, trade school or certificate program.','Full-time undergraduate or at least part-time graduate.','Most recent family AGI (or own AGI if independent) at most $150,000.'],
        income_requirement:{maximum:150000,basis:'Most recent tax-year family AGI, or individual AGI if independent'},
        materials:['Application and documentation supporting diagnosis, income and enrollment; check current portal for complete checklist.'],
        reputation:'Named scholars and recipient biographies exist. A public recipient profile lists the award, but a self-reported GPA is not an award-time cutoff. No reliable accepted-applicant score distribution was found.',
        experiences:[{kind:'self_reported_profile',text:'A public profile lists a July 2025 Cancer for College award and a current 3.6 GPA. It does not establish GPA at selection, so that number is not stored as an admission threshold.',url:'https://www.linkedin.com/in/alejandromacevedo'},
            {kind:'provider_published',text:'Provider features scholar updates, including Taylor/Cherry Hawk recipient Tyler Garland and other named scholars.',url:'https://cancerforcollege.org/available-scholarships/'}],
        sources:[source('https://cancerforcollege.org/application-faqs/'),source('https://cancerforcollege.org/available-scholarships/'),source('https://www.linkedin.com/in/alejandromacevedo','self_reported_profile')],
        manual_checks:['Confirm personal diagnosis, tax-year AGI basis, enrollment intensity, program and current cycle.']
    }),
    entry({name:'Tzu Chi USA Scholars',provider:'Buddhist Tzu Chi Foundation',min_amount:1500,max_amount:1500,requires_essay:1,renewable:1,type:'merit_plus_need',
        apply_url:'https://tzuchi.us/scholarships',
        description:'A $1,500 award for college-bound high school graduates with financial need and community involvement in selected U.S. regions. The reviewed 2026 freshman requirements publish no GPA or SAT/ACT cutoff. Returning recipients have separate 3.0 GPA and service-hour requirements. The 2026 cycle closed April 15; next dates are unconfirmed.'}, {
        gpa_notes:'No numerical GPA minimum in reviewed 2026 freshman rules. The 3.0 minimum is for returning undergraduate recipients only.',
        cycle_status:'closed',cycle_notes:'Last verified deadline April 15, 2026; next cycle and regional coverage unconfirmed.',
        residency_notes:'Selected U.S. regions; confirm coverage with the regional office. Older geographic lists are not current eligibility evidence.',
        renewal_notes:'Returning recipients apply separately; 3.0 GPA, financial need, full-time enrollment and 50 volunteer hours required.',
        requirements:['U.S. graduating high school senior/equivalent entering accredited U.S. college full-time.','Financial need and participating regional coverage.','No race, ethnicity, national-origin, gender, religion or disability restriction in the application.'],
        materials:['Application, financial hardship documentation, community recommendation and autobiography up to 500 words.','Home visit/interview may be required.'],selection:['Financial need, academic achievement/pursuit and community involvement.'],
        reputation:'Provider publishes regional award ceremonies and recipient accounts. These are sponsor-selected stories; Reddit results about Taiwan nursing scholarships were excluded as a different program.',
        experiences:[{kind:'provider_published',text:'A 2025 Southern Region story describes two-time recipient Celeste Molina discussing financial support and opportunities. Midwest coverage identifies returning recipient Abbey Chaidez.',url:'https://tzuchi.us/blog/hope-abounds-at-2025s-southern-region-scholarship-award-ceremony'}],
        sources:[source('https://tzuchi.us/scholarships'),source('https://media.tzuchi.us/wp-content/uploads/2026/01/02094259/Exhibit-2-Application-Form-for-HS-Senior_2026_1_fill.pdf'),source('https://tzuchi.us/blog/hope-abounds-at-2025s-southern-region-scholarship-award-ceremony'),source('https://tzuchi.us/blog/tzu-chi-midwest-scholarships-encourage-students-to-pursue-their-dreams')],
        manual_checks:['Confirm regional coverage, financial need, enrollment and whether applying as a freshman or returning recipient.']
    })
];

module.exports = { fields, scholarships };
