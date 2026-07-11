(function () {
    function clear(element) {
        element.replaceChildren();
    }

    function recordId(value) {
        const id = Number(value);
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    }

    function safeHttpUrl(value) {
        if (typeof value !== "string" || !value.trim()) return null;

        try {
            const url = new URL(value.trim());
            return url.protocol === "http:" || url.protocol === "https:"
                ? url.href
                : null;
        } catch (error) {
            return null;
        }
    }

    function textElement(tagName, text, className) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = text ?? "";
        return element;
    }

    function labeledLine(label, value, fallback = "Not specified") {
        const line = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        line.append(strong, document.createTextNode(value ?? fallback));
        return line;
    }

    function applyLink(value, className = "apply-right-now", text = "Apply Now →") {
        const href = safeHttpUrl(value);
        if (!href) return null;

        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = className;
        link.textContent = text;
        return link;
    }

    function heartIcon(value) {
        const id = recordId(value);
        if (!id) return null;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("heart-icon");
        svg.dataset.id = String(id);
        svg.setAttribute("viewBox", "0 -960 960 960");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z");
        svg.appendChild(path);
        return svg;
    }

    window.ScholarMatchDOM = {
        applyLink,
        clear,
        heartIcon,
        labeledLine,
        recordId,
        safeHttpUrl,
        textElement
    };
}());
