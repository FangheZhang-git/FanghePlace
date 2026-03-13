async function addScholarship() {

    const token = localStorage.getItem("token");
    const messageElement = document.getElementById("message");

    const data = {
        name: document.getElementById("name").value,
        provider: document.getElementById("provider").value,
        min_amount: document.getElementById("min_amount").value,
        max_amount: document.getElementById("max_amount").value,
        min_gpa: document.getElementById("min_gpa").value,
        min_sat: document.getElementById("min_sat").value,
        min_act: document.getElementById("min_act").value,
        citizenship: document.getElementById("citizenship").value,
        state: document.getElementById("state").value,
        major: document.getElementById("major").value,
        requires_essay: document.getElementById("requires_essay").value,
        first_gen_only: document.getElementById("first_gen_only").value,
        leadership: document.getElementById("leadership").value,
        award: document.getElementById("award").value,
        deadline: document.getElementById("deadline").value,
        type: document.getElementById("type").value,
        description: document.getElementById("description").value,
        min_income: document.getElementById("min_income").value,
        max_income: document.getElementById("max_income").value,
        renewable: document.getElementById("renewable").value,
        advanced_coursework_preferred: document.getElementById("advanced_coursework_preferred").value,
        race: document.getElementById("race").value,
        apply_url: document.getElementById("apply_url").value
    };

    let url = "http://localhost:3001/add-scholarship";
    let method = "POST";

    if (editingSubmissionId) {
        url = `http://localhost:3001/admin/submissions/${editingSubmissionId}`;
        method = "PUT";
    }

    const res = await fetch(url, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {

        if (editingSubmissionId) {
            messageElement.innerText = "Scholarship updated successfully.";
        } else {
            messageElement.innerText = "Scholarship added successfully.";
        }

        messageElement.style.color = "green";
        editingSubmissionId = null;
        document.querySelector(".add-btn").innerText = "Add Scholarship";
        document.querySelectorAll(".form-grid input, .form-grid select, .form-grid textarea")
            .forEach(el => el.value = "");
    } else {
        messageElement.innerText = result.error || "Submission failed.";
        messageElement.style.color = "red";
    }

    setTimeout(() => {
        messageElement.innerText = "";
    }, 4000);

}
