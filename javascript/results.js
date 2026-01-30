const student = JSON.parse(localStorage.getItem("studentProfile"));
const container = document.getElementById("scholarshipResults");
let tracking = 0;
function incomeToNumber(range) {
    if (!range) return Infinity;
    if (range.includes("Below")) return 30000;
    if (range.includes("30")) return 60000;
    if (range.includes("60")) return 100000;
    if (range.includes("100")) return 150000;
    return Infinity;
}

function scoreScholarship(scholarship) {
    let score = 0;
    const r = scholarship.requirements;

    // MUST satisfy
    if (r.minGPA && student.gpa < r.minGPA) return null;
    if (r.minSAT && student.sat && student.sat < r.minSAT) return null;
    if (r.minACT && student.act && student.act < r.minACT) return null;
    if (r.citizenship && student.citizenship !== r.citizenship) return null;
    if (r.residencyRequired && student.residency !== r.residency) return null;
    if (r.essayRequired && !student.essay) return null;
    if (r.maxHouseholdIncome && incomeToNumber(student.householdIncome) > r.maxHouseholdIncome) return null;
    if (r.intendedMajors && !r.intendedMajors.includes(student.major)) return null;

    // scoring algorithm
    score += student.gpa * 10;
    if(student.sat >= 1500){
        score += 30;
    }
    else if(student.act >= 34){
        score += student.act/2;
    }


    if (r.advancedCourseworkRequired || r.advancedCourseworkPreferred) {
        if (student.ap || student.honors) score += 5;
        if(student.apHighScores >=3) score+=(10+student.apHighScores);
    }

    if (r.leadershipRequired && student.leadership) score += 5;
    if (r.leadershipPreferred && student.leadership) score += 10;

    if (r.firstGenPreferred && student.firstGen) score += 5;
    if (r.stateOrNationalAwardPreferred && student.award) score += 30;

    return score;
}

function getTag(score) {
    if (score >= 85) return "strongly recommended";
    if (score >= 70) return "recommended";
    return null;
}

scholarships.forEach(sch => {
    const score = scoreScholarship(sch);
    if (score === null) return;

    const tag = getTag(score);

    const card = document.createElement("div");
    card.className = "scholarship-card";

    if (tag === "strongly recommended") {
        card.innerHTML += `<span class="tag strong">Strongly Recommended</span>`;
    } else if (tag === "recommended") {
        card.innerHTML += `<span class="tag recommended">Recommended</span>`;
    }

    card.innerHTML += `
  <h3>${sch.name}</h3>
  <p>${sch.description}</p>
  <p><strong>Award:</strong> ${sch.amount}</p>
  <p><strong>Deadline:</strong> ${sch.deadline}</p>

  <a href="${sch.applyUrl}" 
     target="_blank" 
     rel="noopener noreferrer"
     class="apply-right-now">
     Apply Now →
  </a>
`;


    container.appendChild(card);
    tracking+=1;
});

if(tracking === 0) container.innerHTML+= `<h3>Sorry, no matching scholarships found</h3>`;
