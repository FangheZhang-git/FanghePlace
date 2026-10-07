(function () {
const resultsDiv = document.getElementById("results");
const title = document.getElementById("title");
const { applyLink, clear, heartIcon, labeledLine, recordId, textElement } = window.ScholarMatchDOM;
const query = new URLSearchParams(window.location.search).get("query");

function formatAmount(minAmount, maxAmount) {
    if (minAmount && maxAmount) return `$${minAmount} - $${maxAmount}`;
    if (minAmount) return `$${minAmount}`;
    if (maxAmount) return `$${maxAmount}`;
    return "Not specified";
}

function showScholarship(scholarship) {
    const card = document.createElement("div");
    card.className = "scholarship-card";

    const heart = heartIcon(scholarship.id);
    if (heart) card.appendChild(heart);
    card.appendChild(textElement("h3", scholarship.name ?? ""));

    const id = recordId(scholarship.id);
    if (id) {
        const commentsButton = textElement("button", "Check Comments", "commentButton");
        commentsButton.type = "button";
        commentsButton.addEventListener("click", () => window.openComments(id));
        card.appendChild(commentsButton);
    }

    card.appendChild(textElement("p", scholarship.description ?? "", "scholarship-description"));
    card.appendChild(labeledLine("Provider", scholarship.provider));
    card.appendChild(labeledLine("Award", formatAmount(scholarship.min_amount, scholarship.max_amount)));
    card.appendChild(labeledLine("Deadline", scholarship.deadline));

    const link = applyLink(scholarship.apply_url, "apply-right-now", "Apply Now");
    if (link) card.appendChild(link);
    resultsDiv.appendChild(card);
}

async function loadSearchResults() {
    if (!query) {
        title.textContent = "No search term provided";
        return;
    }

    title.textContent = `Search results for "${query}"`;
    const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
    const matches = await response.json();
    clear(resultsDiv);

    if (!Array.isArray(matches) || matches.length === 0) {
        resultsDiv.appendChild(textElement("p", "No scholarships found."));
        return;
    }

    matches.forEach(showScholarship);
    if (typeof loadSavedHearts === "function") loadSavedHearts();
}

loadSearchResults();
}());
