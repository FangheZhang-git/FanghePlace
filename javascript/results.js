(function () {
const container = document.getElementById("scholarshipResults");
const { applyLink, clear, heartIcon, labeledLine, recordId, textElement } = window.ScholarMatchDOM;

function formatAmount(minAmount, maxAmount) {
    if (minAmount && maxAmount) return `$${minAmount} - $${maxAmount}`;
    if (minAmount) return `$${minAmount}`;
    if (maxAmount) return `$${maxAmount}`;
    return "Not specified";
}

function createMatchCard(scholarship) {
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
    card.appendChild(labeledLine("Match Score", String(Math.round(Number(scholarship.score) || 0))));

    const link = applyLink(scholarship.apply_url, "apply-right-now", "Apply Now");
    if (link) card.appendChild(link);

    return card;
}

async function loadMatches() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("/match", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        clear(container);

        if (!response.ok) {
            container.appendChild(textElement("h3", data.message || "Matching failed."));
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            container.appendChild(textElement("h3", "Sorry, no matching scholarships found"));
            return;
        }

        data.forEach(scholarship => container.appendChild(createMatchCard(scholarship)));
        loadSavedHearts();
    } catch (error) {
        clear(container);
        container.appendChild(textElement("h3", "Matching failed."));
    }
}

loadMatches();
}());
