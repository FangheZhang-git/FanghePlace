const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("barSearch");

searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) return;

  const url = `showTopbar.html?query=${encodeURIComponent(query)}`;
  window.open(url, "_blank");
});


searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    searchButton.click();
  }
});
