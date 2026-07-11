(function () {
let currentScholarshipId = null;
const { clear, recordId, textElement } = window.ScholarMatchDOM;

async function openComments(value) {
    const token = localStorage.getItem("token");
    const id = recordId(value);
    if (!token) {
        alert("Please login first");
        return;
    }
    if (!id) return;

    currentScholarshipId = id;
    const res = await fetch(`/scholarships/${id}/comments`);
    const comments = await res.json();
    const container = document.getElementById("commentsContainer");
    clear(container);

    if (!Array.isArray(comments) || comments.length === 0) {
        container.appendChild(textElement("p", "No comments yet. Start the conversation.", "empty-comments"));
    } else {
        comments.forEach(comment => {
            const div = document.createElement("div");
            div.className = "comment";

            const header = document.createElement("div");
            header.className = "comment-header";
            header.append(
                textElement("span", comment.username ?? "", "comment-user"),
                textElement("span", new Date(comment.created_at).toLocaleDateString(), "comment-date")
            );
            div.append(header, textElement("div", comment.comment ?? "", "comment-text"));
            container.appendChild(div);
        });
    }

    document.getElementById("commentsModal").style.display = "flex";
}

async function submitComment() {
    const token = localStorage.getItem("token");
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text) return alert("Comment cannot be empty");
    if (!token) return alert("Please login first");
    if (!currentScholarshipId) return;

    const res = await fetch(`/scholarships/${currentScholarshipId}/comment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ comment: text })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message || data.error || "Failed to post comment");

    input.value = "";
    openComments(currentScholarshipId);
}

function closeComments() {
    document.getElementById("commentsModal").style.display = "none";
}

document.querySelectorAll("[data-submit-comment]").forEach(button => {
    button.addEventListener("click", submitComment);
});
document.querySelectorAll("[data-close-comments]").forEach(button => {
    button.addEventListener("click", closeComments);
});

window.openComments = openComments;
window.submitComment = submitComment;
window.closeComments = closeComments;
}());
