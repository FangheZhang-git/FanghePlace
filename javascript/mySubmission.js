async function loadMySubmissions() {

    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:3001/my-submissions", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const submissions = await res.json();

    const container = document.getElementById("mySubmissions");

    if (submissions.length === 0) {
        container.innerHTML = "No submissions yet.";
        return;
    }

    container.innerHTML = "";

    submissions.forEach(sub => {

        const card = document.createElement("div");
        card.className = "submission-card";

        card.innerHTML = `
            <h3 class="submission-title">${sub.name}</h3>
            <p><strong>Status:</strong> ${sub.status}</p>
            <p><strong>Submitted:</strong> ${new Date(sub.created_at).toLocaleDateString()}</p>
            <p>Thank you for contributing to our website. Your scholarship submission will help many students find new opportunities.</p>
            `;

        container.appendChild(card);

    });

}

document.getElementById("scholarshipForm")
.addEventListener("submit", function(e){
    e.preventDefault();
    addScholarship();
});

loadMySubmissions();