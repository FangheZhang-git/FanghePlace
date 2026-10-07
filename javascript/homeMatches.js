const homeMatchesContainer = document.getElementById("homeMatchedScholarships");

function formatHomeAmount(minAmount, maxAmount) {
  if (minAmount && maxAmount) {
    return `$${minAmount} - $${maxAmount}`;
  }
  if (minAmount) {
    return `$${minAmount}`;
  }
  if (maxAmount) {
    return `$${maxAmount}`;
  }
  return "Not specified";
}

function appendScholarshipLine(card, label, value) {
  const line = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  line.appendChild(strong);
  line.append(document.createTextNode(value || "Not specified"));
  card.appendChild(line);
}

function createHomeMatchCard(scholarship) {
  const card = document.createElement("article");
  card.className = "matched-scholarship-card";

  const heart = ScholarMatchDOM.heartIcon(scholarship.id);
  if (heart) card.appendChild(heart);

  const title = document.createElement("h3");
  title.textContent = scholarship.name || "Unnamed scholarship";
  card.appendChild(title);

  const id = ScholarMatchDOM.recordId(scholarship.id);
  if (id) {
    const commentsButton = document.createElement("button");
    commentsButton.className = "commentButton";
    commentsButton.type = "button";
    commentsButton.textContent = "Check Comments";
    commentsButton.addEventListener("click", () => window.openComments(id));
    card.appendChild(commentsButton);
  }

  if (scholarship.description) {
    const description = document.createElement("p");
    description.textContent = scholarship.description;
    card.appendChild(description);
  }

  appendScholarshipLine(card, "Provider", scholarship.provider);
  appendScholarshipLine(
    card,
    "Award",
    formatHomeAmount(scholarship.min_amount, scholarship.max_amount)
  );
  appendScholarshipLine(card, "Deadline", scholarship.deadline);
  appendScholarshipLine(
    card,
    "Match Score",
    String(Math.round(Number(scholarship.score) || 0))
  );

  const applyUrl = ScholarMatchDOM.safeHttpUrl(scholarship.apply_url);

  if (applyUrl) {
    const applyLink = document.createElement("a");
    applyLink.className = "apply-right-now";
    applyLink.href = applyUrl;
    applyLink.target = "_blank";
    applyLink.rel = "noopener noreferrer";
    applyLink.textContent = "Apply Now";
    card.appendChild(applyLink);
  }

  return card;
}

async function loadHomeMatches() {
  if (!homeMatchesContainer) return;

  const token = localStorage.getItem("token");
  homeMatchesContainer.textContent = "";

  if (!token) return;

  try {
    const response = await fetch("/match", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!response.ok) return;

    const scholarships = await response.json();
    if (!Array.isArray(scholarships) || scholarships.length === 0) return;

    scholarships.forEach(scholarship => {
      homeMatchesContainer.appendChild(createHomeMatchCard(scholarship));
    });
    if (typeof loadSavedHearts === "function") loadSavedHearts();
  } catch (err) {
    console.error("Failed to load matched scholarships:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadHomeMatches);
