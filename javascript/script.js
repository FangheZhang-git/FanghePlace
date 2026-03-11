document.getElementById("Form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const incomeRaw = document.getElementById("income").value;

  const studentProfile = {
    gpa: parseFloat(document.getElementById("gpa").value) || null,
    sat: parseInt(document.getElementById("sat").value) || null,
    act: parseInt(document.getElementById("act").value) || null,
    citizenship: document.getElementById("citizenship").value || null,
    residency: document.getElementById("residency").value || null,
    major: document.getElementById("major").value || null,

    has_ap: document.getElementById("apCheckbox").checked ? 1 : 0,
    has_honors: document.getElementById("honorsCheckbox").checked ? 1 : 0,

    ap_count: parseInt(document.getElementById("apCount").value) || 0,
    ap_high_scores: parseInt(document.getElementById("apHighScores").value) || 0,
    honors_count: parseInt(document.getElementById("honorsCount").value) || 0,

    has_dual_enrollment: document.getElementById("DECheckbox").checked ?1 : 0,
    dual_enrollment_count: parseInt(document.getElementById("dualCount").value) || 0,

    first_gen: document.querySelector('input[name="firstgen"]:checked')?.value === "yes" ? 1 : 0,
    leadership: document.querySelector('input[name="leadership"]:checked')?.value === "yes" ? 1 : 0,
    award: document.querySelector('input[name="award"]:checked')?.value === "yes" ? 1 : 0,
    willing_essay: document.querySelector('input[name="essay"]:checked')?.value === "yes" ? 1 : 0,

    income: incomeRaw === "" ? null : parseInt(incomeRaw),
    household_size: parseInt(document.getElementById("household").value) || null,

    gender: document.getElementById("gender").value || null,
    race: document.getElementById("race").value ||null
  };

  console.log("PROFILE SUBMIT:", studentProfile);

  const res = await fetch("http://localhost:3001/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(studentProfile)
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Failed to save profile.");
    return;
  }

  window.location.href = "results.html";
});
