const resultsDiv = document.getElementById("results");
const title = document.getElementById("title");

const params = new URLSearchParams(window.location.search);
const query = params.get("query");

if (query) {
    title.textContent = `Search results for "${query}"`;

    const matches = scholarships.filter(sch =>
        sch.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
        resultsDiv.innerHTML = "<p>No scholarships found.</p>";
    } else {
        matches.forEach(renderScholarship);
    }
}


function renderScholarship(sch) {
    const card = document.createElement("div");
    card.className = "scholarship-card";

    card.innerHTML = `
    <h3>${sch.name}</h3>
    <p>${sch.description}</p>
    <p><strong>Award:</strong> ${sch.amount}</p>
    <p><strong>Deadline:</strong> ${sch.deadline}</p>

    <a href="${sch.applyUrl}" target="_blank" class="apply-right-now">
      Apply Now →
    </a>
  `;

    resultsDiv.appendChild(card);
}
