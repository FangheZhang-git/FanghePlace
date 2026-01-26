const incomeValue = document.getElementById("income").value;
const blankCheck = 
    incomeValue === " " ? null : incomeValue;

document.getElementById("Form").addEventListener("submit", function (e) {
  e.preventDefault();

  const studentProfile = {
    gpa: parseFloat(document.getElementById("gpa").value),
    sat: parseInt(document.getElementById("sat").value) || null,
    act: parseInt(document.getElementById("act").value) || null,
    citizenship: document.getElementById("citizenship").value,
    residency: document.getElementById("residency").value,
    major: document.getElementById("major").value,

    ap: document.getElementById("apCheckbox").checked,
    honors: document.getElementById("honorsCheckbox").checked,
    //These three don't guarantee existence
    apCount: parseInt(document.getElementById("apCount").value) || 0,
    apHighScores: parseInt(document.getElementById("apHighScores").value) || 0,
    honorsCount: parseInt(document.getElementById("honorsCount").value) || 0,
    //


    firstGen: document.querySelector('input[name="firstgen"]:checked')?.value === "yes",
    leadership: document.querySelector("input[name='leadership']")?.value === "yes",
    award: document.querySelector('input[name="award"]:checked')?.value === "yes",
    essay: document.querySelector('input[name="essay"]:checked')?.value === "yes",

    householdIncome: blankCheck,

  };

  localStorage.setItem("studentProfile", JSON.stringify(studentProfile));

  window.open("results.html", "_blank");
});
