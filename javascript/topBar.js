const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("barSearch");

searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) return;

  const url = `showTopbar.html?query=${encodeURIComponent(query)}`;
  window.open(url, "_blank");
});


searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});
