document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("barSearch");

  const token = localStorage.getItem("token");

  const loginBtn = document.getElementById("login");
  const signupBtn = document.getElementById("signup");
  const keyToSuccess = document.getElementById("search-button");
  const MyAccount = document.getElementById("account-wrapper");
  if (token) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    MyAccount.style.display = "inline-block";
  } else {
    MyAccount.style.display = "none";
  }

  searchButton.addEventListener("click", () => {

    if (!token) {
      window.location.href = "login.html";
      return;
    }

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

  if (keyToSuccess) {
    keyToSuccess.addEventListener("click", () => {

      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "login.html";
      } else {
        window.location.href = "second.html";
      }

    });
  }


});

function logout() {
  localStorage.removeItem("token");
  window.location.reload();
}