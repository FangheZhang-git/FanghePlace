const resultsDiv = document.getElementById("results");
const title = document.getElementById("title");

const params = new URLSearchParams(window.location.search);
const query = params.get("query");

function formatAmount(minAmount, maxAmount) {
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

async function loadSearchResults() {
    if (!query) {
        title.textContent = "No search term provided";
        return;
    }

    title.textContent = `Search results for "${query}"`;

    const response = await fetch(`http://localhost:3001/search?query=${encodeURIComponent(query)}`);
    const matches = await response.json();

    resultsDiv.innerHTML = "";

    if (matches.length === 0) {
        resultsDiv.innerHTML = "<p>No scholarships found.</p>";
        return;
    }

    matches.forEach(showScholarship);
}

function showScholarship(sch) {
    const card = document.createElement("div");
    card.className = "scholarship-card";

    card.innerHTML = `
        <svg class="heart-icon" data-id="${sch.id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
            <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
        </svg>
        <h3>${sch.name}</h3>
        <p>${sch.description || ""}</p>
        <p><strong>Award:</strong> ${formatAmount(sch.min_amount, sch.max_amount)}</p>
        <p><strong>Deadline:</strong> ${sch.deadline || "Not specified"}</p>
        ${sch.apply_url
            ? `<a href="${sch.apply_url}" target="_blank" class="apply-right-now">
                     Apply Now →
                   </a>`
            : ""
        }
    `;

    resultsDiv.appendChild(card);
}

loadSearchResults();