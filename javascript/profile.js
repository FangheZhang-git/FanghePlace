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

    


  } catch (error) {
    console.error("Dashboard loading error:", error);
    personalInfoContainer.innerHTML = `<p>Something went wrong while loading the dashboard.</p>`;
    savedScholarshipsContainer.innerHTML = "";
    commentsContainer.innerHTML = "";
  }
}

async function loadUserComments(){

    const userId = localStorage.getItem("user_id");

    const res = await fetch(`http://localhost:3001/users/${userId}/comments`);
    const comments = await res.json();

    const container = document.getElementById("userComments");

    container.innerHTML = "";

    if(comments.length === 0){
        container.innerHTML = "<p>No comments yet</p>";
        return;
    }

    comments.forEach(c => {

        const date = new Date(c.created_at).toLocaleDateString();

        const div = document.createElement("div");

        div.className = "user-comment-card";

        div.innerHTML = `
            <div class="comment-scholarship">
                ${c.scholarship_name}
            </div>

            <div class="comment-text">
                ${c.comment}
            </div>

            <div class="comment-date">
                ${date}
            </div>
        `;

        container.appendChild(div);

    });

}



async function loadMySubmissions(){

    const token = localStorage.getItem("token");

    if(!token) return;

    try{

        const res = await fetch("/my-submissions",{
            headers:{
                "Authorization":"Bearer " + token
            }
        });

        const submissions = await res.json();

        const container = document.getElementById("mySubmissions");

        if(!container) return;

        container.innerHTML = "";

        if(submissions.length === 0){

            container.innerHTML =
            `<p class="no-submissions">You haven't submitted any scholarships yet.</p>`;

            return;
        }

        submissions.forEach(sub => {

            const statusColor =
                sub.status === "approved" ? "green" :
                sub.status === "rejected" ? "red" :
                "orange";

            const card = document.createElement("div");

            card.className = "submission-card";

            card.innerHTML = `
                <div class="submission-name">${sub.name}</div>
                <div class="submission-status" style="color:${statusColor}">
                    Status: ${sub.status}
                </div>
            `;

            container.appendChild(card);

        });

    }
    catch(err){
        console.error("Failed to load submissions", err);
    }

}

loadDashboard();

loadUserComments();

loadMySubmissions();
