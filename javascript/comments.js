let currentScholarshipId = null;

async function openComments(id) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        return;
    }
    currentScholarshipId = id;

    const res = await fetch(`http://localhost:3001/scholarships/${id}/comments`)
    const comments = await res.json();

    const container = document.getElementById("commentsContainer");
    container.innerHTML = "";

    if (comments.length === 0) {
        container.innerHTML = `<p class="empty-comments">No comments yet. Start the conversation.</p>`;
        document.getElementById("commentsModal").style.display = "flex";
        return;
    }

    comments.forEach(c => {

        const div = document.createElement("div");

        const date = new Date(c.created_at).toLocaleDateString();

        div.className = "comment";

        div.innerHTML = `
            <div class="comment-header">
                <span class="comment-user">${c.username}</span>
                <span class="comment-date">${date}</span>
            </div>

            <div class="comment-text">
                ${c.comment}
            </div>
        `;

        container.appendChild(div);

    });

    document.getElementById("commentsModal").style.display = "flex";
}

async function submitComment() {

    const token = localStorage.getItem("token");
    const text = document.getElementById("commentInput").value.trim();

    if (!text) {
        alert("Comment cannot be empty");
        return;
    }

    if (!token) {
        alert("Please login first");
        return;
    }

    await fetch(`http://localhost:3001/scholarships/${currentScholarshipId}/comment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            comment: text
        })
    });

    document.getElementById("commentInput").value = "";

    openComments(currentScholarshipId);
}

function closeComments() {
    document.getElementById("commentsModal").style.display = "none";
}
