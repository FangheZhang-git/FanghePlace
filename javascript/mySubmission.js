(function () {
    const dom = window.ScholarMatchDOM;

    async function loadMySubmissions() {
        const token = Boolean((await ScholarMatchSession.ready).user);
        const container = document.getElementById("mySubmissions");
        if (!container || !token) return;

        const res = await ScholarMatchSession.request("/my-submissions", {
            headers: {}
        });
        const submissions = await res.json();
        dom.clear(container);

        if (!Array.isArray(submissions) || submissions.length === 0) {
            container.textContent = "No submissions yet.";
            return;
        }

        submissions.forEach(submission => {
            const card = document.createElement("div");
            card.className = "submission-card";
            card.append(
                dom.textElement("h3", submission.name ?? "", "submission-title"),
                dom.labeledLine("Status", submission.status ?? ""),
                dom.labeledLine("Submitted", new Date(submission.created_at).toLocaleDateString()),
                dom.textElement("p", "Thank you for contributing to our website. Your scholarship submission will help many students find new opportunities.")
            );
            container.appendChild(card);
        });
    }

    document.getElementById("scholarshipForm").addEventListener("submit", event => {
        event.preventDefault();
        addScholarship();
    });

    loadMySubmissions();
}());
