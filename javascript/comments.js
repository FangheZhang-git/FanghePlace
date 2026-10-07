(function () {
let currentScholarshipId = null;
let lastFocusedElement = null;
const { clear, recordId, textElement } = window.ScholarMatchDOM;
const modal = document.getElementById("commentsModal");
const container = document.getElementById("commentsContainer");
const input = document.getElementById("commentInput");
const feedback = document.getElementById("commentFeedback");
const summary = document.getElementById("commentsSummary");
const submitButton = document.querySelector("[data-submit-comment]");

function initials(username) {
    const parts = String(username || "Student").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
}

function friendlyDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function setFeedback(message, state = "") {
    feedback.textContent = message;
    feedback.className = `comment-feedback${state ? ` ${state}` : ""}`;
}

function renderState(message, state = "") {
    clear(container);
    container.appendChild(textElement("p", message, `comments-state${state ? ` ${state}` : ""}`));
}

function renderComments(comments) {
    clear(container);
    summary.textContent = comments.length === 1
        ? "1 student shared an update."
        : comments.length > 1
            ? `${comments.length} students shared updates.`
            : "Be the first to share a helpful note.";

    if (comments.length === 0) {
        renderState("No comments yet. Share an application tip or deadline update to start the conversation.");
        return;
    }

    comments.forEach(comment => {
        const card = document.createElement("article");
        card.className = "comment";
        const username = comment.username || "ScholarMatch student";
        const avatar = textElement("span", initials(username), "comment-avatar");
        avatar.setAttribute("aria-hidden", "true");
        const body = document.createElement("div");
        body.className = "comment-body";
        const header = document.createElement("div");
        header.className = "comment-header";
        header.append(
            textElement("span", username, "comment-user"),
            textElement("time", friendlyDate(comment.created_at), "comment-date")
        );
        body.append(header, textElement("div", comment.comment ?? "", "comment-text"));
        card.append(avatar, body);
        container.appendChild(card);
    });
}

async function loadComments(id) {
    renderState("Loading student comments…");
    try {
        const res = await fetch(`/scholarships/${id}/comments`);
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) throw new Error(data.message || data.error || "Comments could not be loaded.");
        renderComments(data);
    } catch (error) {
        summary.textContent = "Comments are temporarily unavailable.";
        renderState(error.message || "Comments could not be loaded. Please try again.", "error");
    }
}

async function openComments(value) {
    const token = localStorage.getItem("token");
    const id = recordId(value);
    if (!token) return alert("Please log in first.");
    if (!id || !modal) return;

    currentScholarshipId = id;
    lastFocusedElement = document.activeElement;
    modal.style.display = "flex";
    document.body.classList.add("comments-open");
    modal.querySelector(".modal-content").focus();
    setFeedback("Be respectful and keep personal information private.");
    await loadComments(id);
}

async function submitComment() {
    const token = localStorage.getItem("token");
    const text = input.value.trim();
    if (!text) {
        setFeedback("Write a comment before posting.", "error");
        input.focus();
        return;
    }
    if (!token) return alert("Please log in first.");
    if (!currentScholarshipId) return;

    submitButton.disabled = true;
    submitButton.textContent = "Posting…";
    setFeedback("Posting your comment…");
    try {
        const res = await fetch(`/scholarships/${currentScholarshipId}/comment`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ comment: text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to post comment.");
        input.value = "";
        setFeedback("Comment posted.", "success");
        await loadComments(currentScholarshipId);
    } catch (error) {
        setFeedback(error.message || "Failed to post comment. Please try again.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Post comment";
    }
}

function closeComments() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.classList.remove("comments-open");
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

submitButton?.addEventListener("click", submitComment);
document.querySelectorAll("[data-close-comments]").forEach(button => button.addEventListener("click", closeComments));
modal?.addEventListener("click", event => { if (event.target === modal) closeComments(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && modal?.style.display === "flex") closeComments(); });
input?.addEventListener("input", () => {
    const remaining = 1000 - input.value.length;
    setFeedback(input.value.length ? `${remaining} characters remaining` : "Be respectful and keep personal information private.");
});

window.openComments = openComments;
window.submitComment = submitComment;
window.closeComments = closeComments;
}());
