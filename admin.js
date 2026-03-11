const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
}

async function loadScholarships() {
    const res = await fetch("http://localhost:3001/admin/scholarships", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (res.status === 403) {
        alert("Admin access required");
        return;
    }

    const data = await res.json();
    const tbody = document.querySelector("#schTable tbody");
    tbody.innerHTML = "";

    data.forEach(sch => {
        const row = `
            <tr>
                <td>${sch.id}</td>
                <td>${sch.name}</td>
                <td>${sch.provider}</td>
                <td>${sch.min_gpa || "-"}</td>
                <td>
                    <button class="delete-btn" onclick="deleteScholarship(${sch.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function deleteScholarship(id) {
    if (!confirm("Delete this scholarship?")) return;

    await fetch(`http://localhost:3001/admin/scholarships/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    loadScholarships();
}

async function addScholarship() {

    const token = localStorage.getItem("token");

    await fetch("http://localhost:3001/admin/scholarships", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            name: document.getElementById("name").value,
            provider: document.getElementById("provider").value,
            min_amount: null,
            max_amount: null,
            min_gpa: document.getElementById("min_gpa").value,
            min_sat: null,
            min_act: null,
            advanced_coursework_preferred: 0
        })
    });

    loadScholarships();
}

loadScholarships();