const token = localStorage.getItem("token");
let editingId = null;

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
            <td>${sch.id ?? ""}</td>
            <td>${sch.name ?? ""}</td>
            <td>${sch.provider ?? ""}</td>
            <td>${sch.min_amount ?? ""}${sch.max_amount ? " - " + sch.max_amount : ""}</td>
            <td>${sch.min_gpa ?? ""}</td>
            <td>${sch.min_sat ?? ""}</td>
            <td>${sch.min_act ?? ""}</td>
            <td>${sch.major ?? ""}</td>
            <td>${sch.citizenship ?? ""}</td>
            <td>${sch.state ?? ""}</td>
            <td>${sch.requires_essay ?? ""}</td>
            <td>${sch.first_gen_only ?? ""}</td>
            <td>${sch.leadership ?? ""}</td>
            <td>${sch.award ?? ""}</td>
            <td>${sch.min_income ?? ""}</td>
            <td>${sch.max_income ?? ""}</td>
            <td>${sch.renewable ?? ""}</td>
            <td>${sch.advanced_coursework_preferred ?? ""}</td>
            <td>${sch.race ?? ""}</td>
            <td>${sch.deadline ?? ""}</td>
            <td>${sch.type ?? ""}</td>
            <td>${sch.apply_url ? `<a href="${sch.apply_url}" target="_blank">Link</a>` : ""}</td>
            <td>${sch.description ?? ""}</td>
            <td>${sch.created_at ?? ""}</td>
            <td class="action-cell">
                <button class="edit-btn" onclick="editScholarship(${sch.id})">Edit</button>
                <button class="delete-btn" onclick="deleteScholarship(${sch.id})">Delete</button>
            </td>
        </tr>
        `;

        tbody.insertAdjacentHTML("beforeend", row);

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

async function editScholarship(id) {

    editingId = id;

    const res = await fetch(`http://localhost:3001/admin/scholarships/${id}`, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const sch = await res.json();

    document.getElementById("name").value = sch.name || "";
    document.getElementById("provider").value = sch.provider || "";

    document.getElementById("min_amount").value = sch.min_amount || "";
    document.getElementById("max_amount").value = sch.max_amount || "";

    document.getElementById("min_gpa").value = sch.min_gpa || "";
    document.getElementById("min_sat").value = sch.min_sat || "";
    document.getElementById("min_act").value = sch.min_act || "";

    document.getElementById("citizenship").value = sch.citizenship || "";
    document.getElementById("state").value = sch.state || "";
    document.getElementById("major").value = sch.major || "";

    document.getElementById("requires_essay").value = sch.requires_essay;
    document.getElementById("first_gen_only").value = sch.first_gen_only;
    document.getElementById("leadership").value = sch.leadership;

    document.getElementById("award").value = sch.award || "";

    document.getElementById("min_income").value = sch.min_income || "";
    document.getElementById("max_income").value = sch.max_income || "";

    document.getElementById("renewable").value = sch.renewable;
    document.getElementById("advanced_coursework_preferred").value =
        sch.advanced_coursework_preferred;

    document.getElementById("race").value = sch.race || "";

    document.getElementById("deadline").value = sch.deadline || "";

    document.getElementById("type").value = sch.type || "";

    document.getElementById("description").value = sch.description || "";
    document.getElementById("apply_url").value = sch.apply_url || "";

    document.querySelector(".add-btn").innerText = "Save Changes";

    window.scrollTo({ top: 0, behavior: "smooth" });

}



async function addScholarship() {

    const data = {
        name: document.getElementById("name").value,
        provider: document.getElementById("provider").value,

        min_amount: document.getElementById("min_amount").value || null,
        max_amount: document.getElementById("max_amount").value || null,

        min_gpa: document.getElementById("min_gpa").value || null,
        min_sat: document.getElementById("min_sat").value || null,
        min_act: document.getElementById("min_act").value || null,

        citizenship: document.getElementById("citizenship").value || null,
        state: document.getElementById("state").value || null,
        major: document.getElementById("major").value || null,

        requires_essay: document.getElementById("requires_essay").value,
        first_gen_only: document.getElementById("first_gen_only").value,
        leadership: document.getElementById("leadership").value,
        award: document.getElementById("award").value,

        min_income: document.getElementById("min_income").value || null,
        max_income: document.getElementById("max_income").value || null,
        renewable: document.getElementById("renewable").value,
        advanced_coursework_preferred: document.getElementById("advanced_coursework_preferred").value,

        race: document.getElementById("race").value || null,

        description: document.getElementById("description").value || null,
        apply_url: document.getElementById("apply_url").value || null,
        deadline: document.getElementById("deadline").value || null,

        type: document.getElementById("type").value
    };

    const url = editingId
        ? `http://localhost:3001/admin/scholarships/${editingId}`
        : "http://localhost:3001/admin/scholarships";

    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
        method: method,

        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },

        body: JSON.stringify(data)

    });

    loadScholarships();
    editingId = null;
    document.querySelector(".add-btn").innerText = "Add Scholarship";
    document
    .querySelectorAll(".form-grid input, .form-grid select, .form-grid textarea")
    .forEach(el => el.value = "");
    document.getElementById("name").focus();
}

function filterScholarships() {

    const keyword = document.getElementById("searchInput").value.toLowerCase();

    const rows = document.querySelectorAll("#schTable tbody tr");

    rows.forEach(row => {

        const text = row.innerText.toLowerCase();

        if (text.includes(keyword)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

}


loadScholarships();