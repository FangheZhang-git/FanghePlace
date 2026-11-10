const params = new URLSearchParams(window.location.search);
        const blockedPages = new Set(["loading.html", "login.html", "signup.html"]);
        const requestedNext = params.get("next") || "index.html";
        const message = params.get("message") || "Loading";

        function getSafeNextPage(page) {
            try {
                const url = new URL(page, window.location.href);
                const fileName = url.pathname.split("/").pop() || "index.html";

                if (url.origin !== window.location.origin || blockedPages.has(fileName)) {
                    return "index.html";
                }

                return `${url.pathname}${url.search}${url.hash}`;
            } catch {
                return "index.html";
            }
        }

        const nextPage = getSafeNextPage(requestedNext);

        document.getElementById("loadingTitle").innerText = message;

        function redirectNext() {
            window.location.replace(nextPage);
        }

        setTimeout(redirectNext, 900);

        window.addEventListener("pageshow", event => {
            if (event.persisted) {
                redirectNext();
            }
        });
