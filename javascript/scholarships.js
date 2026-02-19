const scholarships = [

    // pure merit based

    {
        name: "Coca-Cola Scholars Program",
        description: "Highly competitive merit-based scholarship recognizing leadership and academic excellence.",
        amount: "$20,000",
        type: "Merit Only",
        applyUrl: "https://www.coca-colascholarsfoundation.org/apply/",
        deadline: "October 31",
        requirements: {
            minGPA: 3.8,
            minSAT: 1500,
            minACT: 34,
            leadershipRequired: true,
            stateOrNationalAwardPreferred: true,
            essayRequired: true
        }
    },

    {
        name: "SEG Scholarships",
        description: "Scholarships recognizing outstanding academic merit and commitment to geophysics and related geosciences.",
        amount: "$10,000",
        type: "Merit",
        applyUrl: "https://seg.org/programs/student-programs/scholarships/",
        deadline: "March 1, 2026",
        requirements: {
            intendedMajors: [
                "Geophysics",
                "Geology",
                "Earth Science",
                "Environmental Science"
            ],
            essayRequired: true
        }
    },

    {
        name: "FS-ISAC Scholarship Program",
        description: "Scholarship supporting students pursuing careers in cybersecurity and information security related to the financial sector.",
        amount: "$10,000",
        type: "Merit",
        applyUrl: "https://www.fsisac.com/scholarships",
        deadline: "March 2, 2026",
        requirements: {
            intendedMajors: [
                "Cybersecurity",
                "Computer Science",
                "Information Technology",
                "Information Security"
            ],
            essayRequired: true
        }
    },

    {
        name: "Gill-Elliott Scholarship",
        description: "STEM-focused scholarship for graduating seniors with strong academics.",
        amount: "$2,000",
        type: "Merit",
        applyUrl: "https://www.bgcf.org/scholarships/",
        deadline: "March 6, 2026",
        requirements: {
            minGPA: 3.8,
            minACT: 32,
            minSAT: 1450,
            intendedMajors: [
                "Engineering",
                "Computer Science",
                "Biology",
                "Chemistry",
                "Mathematics",
                "Pre-Med / Health Sciences"
            ]
        }
    },

    {
        name: "Teachers Federal Credit Union Scholarship",
        description: "Scholarship supporting graduating high school seniors pursuing higher education.",
        amount: "$2,500",
        type: "Merit",
        applyUrl: "https://www.teachersfcu.org/scholarships",
        deadline: "March 7, 2026",
        requirements: {
            minGPA: 3.0,
            essayRequired: true
        }
    },

    {
        name: "Ralph W. Shrader Graduate Scholarship",
        description: "Graduate-level scholarship for students pursuing eligible majors aligned with AFCEA’s mission.",
        amount: "$3,000",
        type: "Merit",
        applyUrl: "https://www.afcea.org/shrader-graduate-scholarship",
        deadline: "May 1, 2026",
        requirements: {
            essayRequired: true
        }
    },

    {
        name: "National Greenhouse Manufacturers Association Scholarship",
        description: "Scholarship for students majoring in horticulture or bioengineering-related fields.",
        amount: "$5,000",
        type: "Merit",
        applyUrl: "https://ngma.com/scholarships/",
        deadline: "May 1, 2026",
        requirements: {
            minGPA: 3.0,
            intendedMajors: [
                "Biology",
                "Environmental Science",
                "Engineering"
            ]
        }
    },

    {
        name: "Cameron Impact Scholarship",
        description: "Full-tuition, merit-based scholarship for students committed to leadership and service.",
        amount: "Full Tuition",
        type: "Merit",
        applyUrl: "https://www.bryancameroneducationfoundation.org/",
        deadline: "May 21, 2026",
        requirements: {
            minGPA: 3.7,
            leadershipRequired: true,
            essayRequired: true
        }
    },

    {
        name: "CAPTRUST Scholarship",
        description: "Scholarship supporting students preparing for professional careers.",
        amount: "$2,000",
        type: "Merit",
        applyUrl: "https://www.captrust.com/the-captrust-scholarship/",
        deadline: "May 31, 2026",
        requirements: {
            essayRequired: true
        }
    },

    {
        name: "National Videogame Museum Scholarships",
        description: "Scholarships supporting students pursuing careers in gaming and technology.",
        amount: "$5,000",
        type: "Merit",
        applyUrl: "https://nvmusa.org/scholarships/",
        deadline: "June 1, 2026",
        requirements: {
            intendedMajors: [
                "Computer Science",
                "Engineering"
            ]
        }
    },

    {
        name: "Adam Ferrari Health Science Scholarship",
        description: "Scholarship for students pursuing health science careers focused on disability care.",
        amount: "$20,000",
        type: "Merit",
        applyUrl: "https://www.adamferrarischolarship.com/scholarship",
        deadline: "July 13, 2026",
        requirements: {
            intendedMajors: ["Pre-Med / Health Sciences"],
            essayRequired: true
        }
    },

    {
        name: "National Merit Finalist Scholarship",
        description: "Awarded to top-performing students based on standardized testing and academics.",
        amount: "$2,500+",
        type: "Merit Only",
        applyUrl: "https://osa.nationalmerit.org/",
        deadline: "February 1",
        requirements: {
            minSAT: 1450,
            minGPA: 3.7,
            advancedCourseworkPreferred: true
        }
    },

    {
        name: "Presidential Scholars Award",
        description: "Recognizes exceptional academic achievement nationwide.",
        amount: "Up to $10,000",
        type: "Merit Only",
        applyUrl: "https://www.ed.gov/grants-and-programs/recognition-programs/us-presidential-scholars-program",
        deadline: "January 15",
        requirements: {
            minGPA: 3.9,
            minSAT: 1500,
            minACT: 33,
            leadershipPreferred: true
        }
    },

    {
        name: "STEM Excellence Scholarship",
        description: "Merit-based scholarship for outstanding students pursuing STEM majors.",
        amount: "$15,000",
        type: "Merit Only",
        applyUrl: "https://scholarshipamerica.org/scholarship/stemexcellence/",
        deadline: "March 15",
        requirements: {
            minGPA: 3.6,
            intendedMajors: ["Computer Science", "Engineering", "Biology"],
            advancedCourseworkRequired: true,
            essayRequired: true
        }
    },



    // merit (mainly) + need (partially)

    {
        name: "Gates Scholarship",
        description: "Merit-based scholarship that also considers financial need.",
        amount: "Full Cost of Attendance",
        type: "Merit + Need",
        applyUrl: "https://www.thegatesscholarship.org/scholarship",
        deadline: "September 15",
        requirements: {
            minGPA: 3.7,
            citizenship: ["U.S. Citizen", "Permanent Resident"],
            firstGenPreferred: true,
            maxHouseholdIncome: 65000,
            essayRequired: true
        }
    },

    {
        name: "Jack Kent Cooke Foundation Scholarship",
        description: "High-achieving students with financial need.",
        amount: "Up to $55,000/year",
        type: "Merit + Need",
        applyUrl: "https://www.jkcf.org/our-scholarships/college-scholarship-program/",
        deadline: "November 15",
        requirements: {
            minGPA: 3.9,
            minSAT: 1450,
            minACT: 32,
            advancedCourseworkRequired: true,
            maxHouseholdIncome: 95000,
            essayRequired: true
        }
    },

    {
        name: "QuestBridge National College Match",
        description: "Connects top students from low-income backgrounds with elite colleges.",
        amount: "Full Tuition + Housing",
        type: "Merit + Need",
        applyUrl: "https://www.questbridge.org/high-school-students/national-college-match",
        deadline: "September 27",
        requirements: {
            minGPA: 3.8,
            maxHouseholdIncome: 65000,
            firstGenPreferred: true,
            advancedCourseworkPreferred: true,
            essayRequired: true
        }
    },

    {
        name: "Dell Scholars Program",
        description: "Merit-focused scholarship that supports students with financial need.",
        amount: "$20,000",
        type: "Merit + Need",
        applyUrl: "https://www.dellscholars.org/",
        deadline: "December 1",
        requirements: {
            minGPA: 3.5,
            leadershipPreferred: true,
            firstGenPreferred: true,
            maxHouseholdIncome: 70000,
            essayRequired: true
        }
    },

    {
        name: "International Essential Tremor Foundation Scholarship",
        description: "Scholarship for students diagnosed with essential tremor pursuing higher education.",
        amount: "$7,500",
        type: "Need-Based",
        applyUrl: "https://essentialtremor.org/resources/scholarships/",
        deadline: "May 1, 2026",
        requirements: {
            essayRequired: true
        }
    },

    {
        name: "Center for Cyber Safety and Education Academic Scholarships",
        description: "Academic scholarships supporting students pursuing cybersecurity and information assurance degrees.",
        amount: "$5,000",
        type: "Merit + Need",
        applyUrl: "https://www.iamcybersafe.org/s/scholarships",
        deadline: "March 15",
        requirements: {
            minGPA: 3.3,
            intendedMajors: ["Cybersecurity", "Information Security", "Computer Science", "IT"],
            citizenship: ["U.S. Citizen", "Permanent Resident", "International Student"],
            essayRequired: true,
        }
    },

    {
        name: "Georgia WISH STEM Scholarships",
        description: "Scholarship for Georgia high school seniors pursuing STEM degrees at the college level.",
        amount: "$500",
        type: "Merit + Need",
        applyUrl: "https://www.wentworthscihealth.org/scholarship-grant-winners",
        deadline: "March 21",
        requirements: {
            residency: "GA",
            intendedMajors: ["Computer Science", "Mathematics", "Engineering"],
            essayRequired: true,
        }
    },

    {
        name: "Chick-fil-A Community Scholars",
        description: "Leadership-focused scholarship supporting students with strong academics, community service, and financial need who are continuing their education.",
        amount: "$25,000",
        type: "Merit + Need",
        applyUrl: "https://www.chick-fil-a.com/community-scholars",
        deadline: "October 28",
        requirements: {
            minGPA: 3.0,
            minSAT: 1400,
            leadershipRequired: true,
            citizenship: ["U.S. Citizen", "Permanent Resident"],
            essayRequired: true
        }
    },

    {
        name: "Gucci Changemakers Scholarship",
        description: "Scholarship supporting diverse students pursuing creative and business-oriented fields such as fashion, design, art, and business.",
        amount: "$25,000",
        type: "Merit + Need",
        applyUrl: "https://www.gucci.com/us/en/nst/equilibrium-changemakers",
        deadline: "February 20, 2026",
        requirements: {
            intendedMajors: [
                "Business",
                "Fashion",
                "Design",
                "Art",
                "Marketing",
                "Film",
                "Music",
                "Law"
            ],
            essayRequired: true,
            financialNeedRequired: true
        }
    },





    {
        name: "Renaissance Scholars Program",
        description: "Supports high-achieving first-generation students with moderate financial need.",
        amount: "$20,000",
        type: "Merit + Need",
        applyUrl: "https://www.trfwebsite.org/applicant-resources",
        deadline: "February 1, 2026",
        requirements: {
            minGPA: 3.6,
            firstGenPreferred: true,
            leadershipPreferred: true,
            maxHouseholdIncome: 80000,
            essayRequired: true
        }
    },

    {
        name: "The Rezvan Foundation for Excellence Scholarship",
        description: "Full-tuition scholarship for exceptionally talented students with foster care experience.",
        amount: "$100,000",
        type: "Merit + Need",
        applyUrl: "https://www.rezvanfoundation.org/",
        deadline: "February 28, 2026",
        requirements: {
            minGPA: 3.5,
            essayRequired: true,
            financialNeedRequired: true
        }
    },

    {
        name: "Ernest F. Hollings Undergraduate Scholarship",
        description: "Merit-based STEM scholarship with additional consideration for financial need.",
        amount: "$40,000",
        type: "Merit + Need",
        applyUrl: "https://www.scholarships.com/financial-aid/college-scholarships/scholarship-directory/academic-major/science",
        deadline: "January 31, 2026",
        requirements: {
            minGPA: 3.6,
            intendedMajors: ["Computer Science", "Engineering", "Biology"],
            advancedCourseworkRequired: true,
            maxHouseholdIncome: 85000,
            essayRequired: true
        }
    }


];
