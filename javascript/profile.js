(function () {
    const dom = window.ScholarMatchDOM;
    const welcomeText = document.getElementById("welcomeText");
    const personalInfoContainer = document.getElementById("personalInfo");

    function profileValue(value) {
        return value === null || value === undefined || value === "" ? "Not provided" : String(value);
    }

    function yesNo(value) {
        if (value === null || value === undefined || value === "") return "Not provided";
        return value === true || value === 1 || value === "1" ? "Yes" : "No";
    }

    async function loadDashboard() {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in first.");
            window.location.href = "login.html";
            return;
        }

        try {
            const response = await fetch("/profile", {
                headers: { "Authorization": "Bearer " + token }
            });
            const profile = await response.json();
            dom.clear(personalInfoContainer);

            if (!response.ok) {
                personalInfoContainer.appendChild(dom.textElement("p", profile.message || "Failed to load profile."));
                return;
            }

            welcomeText.textContent = `Welcome, ${profile.first_name ?? ""}`;
            const fields = [
                ["First Name", profile.first_name], ["Last Name", profile.last_name],
                ["Email", profile.email], ["Unweighted GPA", profile.gpa],
                ["SAT Score", profile.sat], ["ACT Score", profile.act],
                ["Citizenship Status", profile.citizenship], ["Gender", profile.gender],
                ["Race", profile.race], ["Intended Major", profile.major],
                ["Number of AP Classes Taken", profile.ap_count],
                ["Number of AP scores 4 or 5", profile.ap_high_scores],
                ["Number of Honor Classes Taken", profile.honors_count],
                ["Number of Dual Enrollment Classes Taken", profile.dual_enrollment_count],
                ["First Generation College Student?", yesNo(profile.first_gen)],
                ["Leadership Role", yesNo(profile.leadership)],
                ["Household Income Range", profile.income], ["Household Size", profile.household_size],
                ["State or National Award", yesNo(profile.award)],
                ["Willing to Write Essays?", yesNo(profile.willing_essay)]
            ];
            fields.forEach(([label, value]) => {
                personalInfoContainer.appendChild(dom.labeledLine(label, profileValue(value), "Not provided"));
            });
        } catch (error) {
            dom.clear(personalInfoContainer);
            personalInfoContainer.appendChild(dom.textElement("p", "Something went wrong while loading the dashboard."));
        }
    }

    async function loadUserComments() {
        const token = localStorage.getItem("token");
        const container = document.getElementById("userComments");
        if (!token || !container) return;

        try {
            const res = await fetch("/my-comments", {
                headers: { "Authorization": "Bearer " + token }
            });

            if (!res.ok) {
                dom.clear(container);
                const message = res.status === 401 || res.status === 403
                    ? "Your session has expired. Please log in again."
                    : "Failed to load your comments. Please try again later.";
                container.appendChild(dom.textElement("p", message));
                return;
            }

            const comments = await res.json();
            if (!Array.isArray(comments)) {
                throw new Error("Invalid comments response");
            }

            dom.clear(container);
            if (comments.length === 0) {
                container.appendChild(dom.textElement("p", "No comments yet"));
                return;
            }

            comments.forEach(comment => {
                const card = document.createElement("div");
                card.className = "user-comment-card";
                card.append(
                    dom.textElement("div", comment.scholarship_name ?? "", "comment-scholarship"),
                    dom.textElement("div", comment.comment ?? "", "comment-text"),
                    dom.textElement("div", new Date(comment.created_at).toLocaleDateString(), "comment-date")
                );
                container.appendChild(card);
            });
        } catch (error) {
            console.error("Failed to load comments", error);
            dom.clear(container);
            container.appendChild(dom.textElement("p", "Failed to load your comments. Please try again later."));
        }
    }

    async function loadMySubmissions() {
        const token = localStorage.getItem("token");
        const container = document.getElementById("mySubmissions");
        if (!token || !container) return;

        const res = await fetch("/my-submissions", {
            headers: { "Authorization": "Bearer " + token }
        });
        const submissions = await res.json();
        dom.clear(container);

        if (!Array.isArray(submissions) || submissions.length === 0) {
            container.appendChild(dom.textElement("p", "You haven't submitted any scholarships yet.", "no-submissions"));
            return;
        }

        submissions.forEach(submission => {
            const card = document.createElement("div");
            card.className = "submission-card";
            card.appendChild(dom.textElement("div", submission.name ?? "", "submission-name"));
            const status = dom.textElement("div", `Status: ${submission.status ?? ""}`, "submission-status");
            const statusColors = { approved: "green", rejected: "red", pending: "orange" };
            status.style.color = statusColors[submission.status] || "orange";
            card.appendChild(status);
            container.appendChild(card);
        });
    }

    loadDashboard();
    loadUserComments();
    loadMySubmissions();
}());
