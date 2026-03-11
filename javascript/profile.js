const welcomeText = document.getElementById("welcomeText");
const personalInfoContainer = document.getElementById("personalInfo");
const savedScholarshipsContainer = document.getElementById("savedScholarships");
const commentsContainer = document.getElementById("commentsContainer");

async function loadDashboard() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please log in first.");
    window.location.href = "login.html";
    return;
  }

  try {
    // 1. load user profile
    const profileResponse = await fetch("http://localhost:3001/profile", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const profileData = await profileResponse.json();
    console.log(profileData);

    if (!profileResponse.ok) {
      personalInfoContainer.innerHTML = `<p>${profileData.message || "Failed to load profile."}</p>`;
    } else {
      welcomeText.innerText = `Welcome, ${profileData.first_name}`;

      personalInfoContainer.innerHTML = `
        <p><strong>First Name:</strong> ${profileData.first_name || "Not provided"}</p>
        <p><strong>Last Name:</strong> ${profileData.last_name || "Not provided"}</p>
        <p><strong>Email:</strong> ${profileData.email || "Not provided"}</p>
        <p><strong>Unweighted GPA:</strong> ${profileData.gpa || "Not provided"}</p>
        <p><strong>SAT Score:</strong> ${profileData.sat || "Not provided"}</p>
        <p><strong>ACT Score:</strong> ${profileData.act || "Not provided"}</p>
        <p><strong>Citizenship Status:</strong> ${profileData.citizenship || "Not provided"}</p>
        <p><strong>Gender:</strong> ${profileData.gender || "Not provided"}</p>
        <p><strong>Race:</strong> ${profileData.race || "Not provided"}</p>
        <p><strong>Intended Major:</strong> ${profileData.major || "Not provided"}</p>
        <p><strong>Number of AP Classes Taken:</strong> ${profileData.ap_count || "Not provided"}</p>
        <p><strong>Number of AP scores 4 or 5:</strong> ${profileData.ap_high_scores || "Not provided"}</p>
        <p><strong>Number of Honor Classes Taken:</strong> ${profileData.honors_count || "Not provided"}</p>
        <p><strong>Number of Dual Enrollment Classes Taken:</strong> ${profileData.dual_enrollment_count || "Not provided"}</p>
        <p><strong>First Generation College Student?:</strong> ${profileData.first_gen ? "Yes" : "No" || "Not provided"}</p>
        <p><strong>Leadership Role:</strong> ${profileData.leadership ? "Yes" : "No"|| "Not provided"}</p>
        <p><strong>Household Income Range:</strong> ${profileData.income || "Not provided"}</p>
        <p><strong>Household Size:</strong> ${profileData.household_size || "Not provided"}</p>
        <p><strong>State or National Award:</strong> ${profileData.award ? "Yes" : "No" || "Not provided"}</p>
        <p><strong>Willing to Write Essays?:</strong> ${profileData.willing_essay ? "Yes" : "No" || "Not provided"}</p>


      `;
    }

    // // 2. load saved scholarships
    // const savedResponse = await fetch("http://localhost:3001/saved-scholarships", {
    //   headers: {
    //     "Authorization": "Bearer " + token
    //   }
    // });

    // const savedData = await savedResponse.json();

    // if (!savedResponse.ok) {
    //   savedScholarshipsContainer.innerHTML = `<p>${savedData.message || "Failed to load saved scholarships."}</p>`;
    // } else if (savedData.length === 0) {
    //   savedScholarshipsContainer.innerHTML = `<p>You have not saved any scholarships yet.</p>`;
    // } else {
    //   savedScholarshipsContainer.innerHTML = "";

    //   savedData.forEach(sch => {
    //     const card = document.createElement("div");
    //     card.className = "dashboard-card";

    //     card.innerHTML = `
    //       <h3>${sch.name}</h3>
    //       <p><strong>Award:</strong> ${sch.award || "Not specified"}</p>
    //       <p><strong>Deadline:</strong> ${sch.deadline || "Not specified"}</p>
    //     `;

    //     savedScholarshipsContainer.appendChild(card);
    //   });
    // }

    // // 3. load comments
    // const commentsResponse = await fetch("http://localhost:3001/my-comments", {
    //   headers: {
    //     "Authorization": "Bearer " + token
    //   }
    // });

    // const commentsData = await commentsResponse.json();

    // if (!commentsResponse.ok) {
    //   commentsContainer.innerHTML = `<p>${commentsData.message || "Failed to load comments."}</p>`;
    // } else if (commentsData.length === 0) {
    //   commentsContainer.innerHTML = `<p>You have not posted any comments yet.</p>`;
    // } else {
    //   commentsContainer.innerHTML = "";

    //   commentsData.forEach(comment => {
    //     const card = document.createElement("div");
    //     card.className = "dashboard-card";

    //     card.innerHTML = `
    //       <h3>${comment.scholarship_name || "Scholarship"}</h3>
    //       <p>${comment.comment_text || ""}</p>
    //       <p><strong>Posted:</strong> ${comment.created_at || "Unknown date"}</p>
    //     `;

    //     commentsContainer.appendChild(card);
    //   });
    // }

  } catch (error) {
    console.error("Dashboard loading error:", error);
    personalInfoContainer.innerHTML = `<p>Something went wrong while loading the dashboard.</p>`;
    savedScholarshipsContainer.innerHTML = "";
    commentsContainer.innerHTML = "";
  }
}

loadDashboard();