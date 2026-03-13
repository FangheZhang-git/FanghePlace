const token = localStorage.getItem("token");
let editingId = null;
let editingSubmissionId = null;

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


async function loadSubmissions() {

    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:3001/admin/submissions", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const submissions = await res.json();

    const container = document.getElementById("submissionsContainer");

    if (submissions.length === 0) {
        container.innerHTML = "No pending submissions.";
        return;
    }

    container.innerHTML = "";

    submissions.forEach(sub => {

        const card = document.createElement("div");
        card.className = "submission-card";

        card.innerHTML = `
            <h3>${sub.name}</h3>
            <p><strong>Provider:</strong> ${sub.provider || "-"}</p>
            <p><strong>Submitted by:</strong> ${sub.user_email}</p>
            <p><strong>Amount:</strong> ${sub.min_amount || "-"} - ${sub.max_amount || "-"}</p>
            <p><strong>Deadline:</strong> ${sub.deadline || "-"}</p>

            <div class="admin-actions">
                <button onclick="approveSubmission(${sub.id})">Approve</button>
                <button onclick="editSubmission(${sub.id})">Edit</button>
                <button onclick="rejectSubmission(${sub.id})">Reject</button>
            </div>
        `;

        container.appendChild(card);

    });

}

async function approveSubmission(id) {

    const token = localStorage.getItem("token");

    const res1 = await fetch(`http://localhost:3001/admin/submissions/${id}`, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const submission = await res1.json();

    const res2 = await fetch(`http://localhost:3001/admin/submissions/${id}/approve`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(submission)
    });

    const result = await res2.json();

    alert(result.message);

    loadSubmissions();

}

async function rejectSubmission(id) {

    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3001/admin/submissions/${id}/reject`, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const result = await res.json();

    alert(result.message);

    loadSubmissions();

}


async function editSubmission(id) {

    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3001/admin/submissions/${id}`, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const data = await res.json();

    // basic info
    document.getElementById("name").value = data.name || "";
    document.getElementById("provider").value = data.provider || "";

    // amount
    document.getElementById("min_amount").value = data.min_amount || "";
    document.getElementById("max_amount").value = data.max_amount || "";

    // academics
    document.getElementById("min_gpa").value = data.min_gpa || "";
    document.getElementById("min_sat").value = data.min_sat || "";
    document.getElementById("min_act").value = data.min_act || "";

    // eligibility
    document.getElementById("citizenship").value = data.citizenship || "";
    document.getElementById("state").value = data.state || "";
    document.getElementById("major").value = data.major || "";

    // requirements
    document.getElementById("requires_essay").value = data.requires_essay ?? "0";
    document.getElementById("first_gen_only").value = data.first_gen_only ?? "0";
    document.getElementById("leadership").value = data.leadership || "not_considered";
    document.getElementById("award").value = data.award || "not_considered";

    // deadline
    document.getElementById("deadline").value = data.deadline || "";

    // type
    document.getElementById("type").value = data.type || "pure_merit_based";

    // description
    document.getElementById("description").value = data.description || "";

    // income
    document.getElementById("min_income").value = data.min_income || "";
    document.getElementById("max_income").value = data.max_income || "";

    // misc
    document.getElementById("renewable").value = data.renewable ?? "0";
    document.getElementById("advanced_coursework_preferred").value = data.advanced_coursework_preferred ?? "0";

    // race
    document.getElementById("race").value = data.race || "";

    // application link
    document.getElementById("apply_url").value = data.apply_url || "";

    editingSubmissionId = id;

    document.querySelector(".add-btn").innerText = "Update Scholarship";

    // scroll to top so admin sees the form
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

loadSubmissions();





loadScholarships();