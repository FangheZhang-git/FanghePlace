(function () {
    const dom = window.ScholarMatchDOM;

    function formatSavedAmount(min, max) {
        if (!min && !max) return "Not specified";
        if (min && max) return `$${min} - $${max}`;
        if (min) return `$${min}+`;
        return `$${max}`;
    }

    document.addEventListener("click", async event => {
        const heart = event.target.closest(".heart-icon");
        if (!heart) return;

        const scholarshipId = dom.recordId(heart.dataset.id);
        const token = localStorage.getItem("token");
        if (!scholarshipId || !token) return;

        try {
            const res = await fetch("/toggle-save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ scholarship_id: scholarshipId })
            });
            if (!res.ok) return console.error("Save failed");

            const data = await res.json();
            heart.classList.toggle("saved", Boolean(data.saved));
            loadSavedScholarships();
        } catch (err) {
            console.error(err);
        }
    });

    function createSavedCard(scholarship) {
        const card = document.createElement("div");
        card.className = "scholarship-card";

        const heart = dom.heartIcon(scholarship.id);
        if (heart) card.appendChild(heart);
        card.appendChild(dom.textElement("h3", scholarship.name ?? ""));

        const id = dom.recordId(scholarship.id);
        if (id) {
            const commentsButton = dom.textElement("button", "Check Comments", "comment");
            commentsButton.type = "button";
            commentsButton.addEventListener("click", () => window.openComments(id));
            card.appendChild(commentsButton);
        }

        card.appendChild(dom.textElement("p", scholarship.description ?? ""));
        card.appendChild(dom.labeledLine("Award", formatSavedAmount(scholarship.min_amount, scholarship.max_amount)));
        card.appendChild(dom.labeledLine("Deadline", scholarship.deadline));

        const link = dom.applyLink(scholarship.apply_url);
        if (link) card.appendChild(link);
        return card;
    }

    async function loadSavedScholarships() {
        const container = document.getElementById("savedScholarships");
        const token = localStorage.getItem("token");
        if (!container || !token) return;

        const res = await fetch("/saved-scholarships", {
            headers: { "Authorization": "Bearer " + token }
        });
        const scholarships = await res.json();
        dom.clear(container);

        if (!Array.isArray(scholarships) || scholarships.length === 0) {
            container.appendChild(dom.textElement("p", "No saved scholarships yet", "empty-message"));
            return;
        }

        scholarships.forEach(scholarship => container.appendChild(createSavedCard(scholarship)));
        loadSavedHearts();
    }

    async function loadSavedHearts() {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("/saved-ids", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const savedSet = new Set(data.map(item => dom.recordId(item.scholarship_id)).filter(Boolean));
        document.querySelectorAll(".heart-icon").forEach(heart => {
            const id = dom.recordId(heart.dataset.id);
            heart.classList.toggle("saved", Boolean(id && savedSet.has(id)));
        });
    }

    window.loadSavedScholarships = loadSavedScholarships;
    window.loadSavedHearts = loadSavedHearts;

    document.addEventListener("DOMContentLoaded", () => {
        loadSavedHearts();
        if (document.getElementById("savedScholarships")) loadSavedScholarships();
    });
}());
