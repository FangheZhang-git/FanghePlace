document.addEventListener("click", async (e) => {

    const heart = e.target.closest(".heart-icon")
    if (!heart) return

    const scholarshipId = Number(heart.dataset.id)
    const token = localStorage.getItem("token")

    try {

        const res = await fetch("http://localhost:3001/toggle-save", {

            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },

            body: JSON.stringify({
                scholarship_id: scholarshipId
            })

        })

        if (!res.ok) {
            console.error("Save failed")
            return
        }

        const data = await res.json()

        if (data.saved) {
            heart.classList.add("saved")
        } else {
            heart.classList.remove("saved")
        }

        loadSavedScholarships()

    } catch (err) {
        console.error(err)
    }

})
function formatAmount(min, max) {
    if (!min && !max) return "Not specified"
    if (min && max) return `$${min} - $${max}`
    if (min) return `$${min}+`
    return `$${max}`
}

async function loadSavedScholarships() {

    const token = localStorage.getItem("token")

    const res = await fetch(
        "http://localhost:3001/saved-scholarships",
        {
            headers: {
                Authorization: "Bearer " + token
            }
        }
    )

    const scholarships = await res.json()

    console.log(scholarships)

    const container =
        document.getElementById("savedScholarships")

    if (!container) return

    container.innerHTML = ""


    if (scholarships.length === 0) {
        container.innerHTML = `
        <p class="empty-message"> No saved scholarships yet </p>
        `
        return
    }

    scholarships.forEach(s => {

        const card = document.createElement("div")

        card.className = "scholarship-card"

        card.innerHTML = `
            <svg class="heart-icon" data-id="${s.id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
            </svg>
            <h3>${s.name}</h3>
            <p>${s.description}</p>
            <p><strong>Award:</strong> ${formatAmount(s.min_amount, s.max_amount)}</p>
            <p><strong>Deadline:</strong> ${s.deadline || "Not specified"}</p>
                    ${s.apply_url
            ? `<a href="${s.apply_url}" target="_blank" class="apply-right-now">
                     Apply Now →
                   </a>`
            : ""
        }
        `

        container.appendChild(card)

    })

    loadSavedHearts()

}


async function loadSavedHearts() {

    const token = localStorage.getItem("token")

    if (!token) return

    const res = await fetch("http://localhost:3001/saved-ids", {
        headers: {
            Authorization: "Bearer " + token
        }
    })

    const data = await res.json()

    const savedSet = new Set(
        data.map(x => x.scholarship_id)
    )

    document.querySelectorAll(".heart-icon")
        .forEach(heart => {

            const id = Number(heart.dataset.id)

            if (savedSet.has(id)) {
                heart.classList.add("saved")
            }

        })

}


document.addEventListener("DOMContentLoaded", () => {

    loadSavedHearts()

    if (document.getElementById("savedScholarships")) {
        loadSavedScholarships()
    }

})

