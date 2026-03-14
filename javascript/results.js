const container = document.getElementById("scholarshipResults");

function getTag(score) {
    if (score >= 85) return "strongly recommended";
    if (score >= 70) return "recommended";
    return null;
}

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

async function loadMatches() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please log in first.");
        window.location.href = "login.html";
        return;
    }

    const response = await fetch("http://localhost:3001/match", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const data = await response.json();

    if (!response.ok) {
        container.innerHTML = `<h3>${data.message || "Matching failed."}</h3>`;
        return;
    }

    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `<h3>Sorry, no matching scholarships found</h3>`;
        return;
    }

    data.forEach(sch => {
        const tag = getTag(sch.score);

        const card = document.createElement("div");
        card.className = "scholarship-card";


        card.innerHTML += `
        <svg class="heart-icon" data-id="${sch.id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
            <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
        </svg>
      <h3>${sch.name}</h3>
      <button onclick="openComments(${sch.id})" class="commentButton">
            View Comments
      </button>

      <p>${sch.description || ""}</p>
      <p><strong>Award:</strong> ${formatAmount(sch.min_amount, sch.max_amount)}</p>
      <p><strong>Deadline:</strong> ${sch.deadline || "Not specified"}</p>
      <p><strong>Match Score:</strong> ${Math.round(sch.score)}</p>

      ${sch.apply_url
                ? `<a href="${sch.apply_url}"
                target="_blank"
                rel="noopener noreferrer"
                class="apply-right-now">
                Apply Now →
             </a>`
                : ""
            }
    `;

        if (tag === "strongly recommended") {
            card.innerHTML += `<span class="tag strong">Strongly Recommended</span>`;
        } else if (tag === "recommended") {
            card.innerHTML += `<span class="tag recommended">Recommended</span>`;
        }

        container.appendChild(card);
    });
    loadSavedHearts()
}

loadMatches();