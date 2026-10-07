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

    function cycleLabel(scholarship) {
        const r = scholarship.research;
        if (!r) return '';
        const today = new Date().toISOString().slice(0, 10);
        if (r.stale) return 'Research needs rechecking after an edit';
        if (r.cycle_status === 'closed' || (r.closes_on && r.closes_on < today)) return 'Closed — next cycle not confirmed';
        if (r.opens_on && r.opens_on > today) return 'Opens ' + r.opens_on;
        // A month-only opening must not turn into a fabricated exact date.
        if (r.cycle_status === 'upcoming' && !r.opens_on) return 'Upcoming — confirm dates with provider';
        if (r.cycle_status === 'upcoming' && !r.closes_on) return 'Confirm current application window';
        return 'Published deadline: ' + (scholarship.deadline || 'Check local/provider dates');
    }

    function academicValue(value) {
        if (value === null || value === undefined || value === '') return 'Not published';
        return Number(value) === 0 ? 'No minimum / not considered' : String(Number(value));
    }

    function appendResearch(card, scholarship) {
        if (!scholarship.research) return;
        const block = textElement('div', '', 'scholarship-research-summary');
        block.appendChild(textElement('p', cycleLabel(scholarship), 'research-status'));
        block.appendChild(labeledLine('GPA minimum', academicValue(scholarship.min_gpa)));
        block.appendChild(labeledLine('SAT minimum', academicValue(scholarship.min_sat)));
        block.appendChild(labeledLine('ACT minimum', academicValue(scholarship.min_act)));
        block.appendChild(textElement('p', 'Eligibility needs confirmation. Check age, enrollment and any special conditions.'));
        const id = recordId(scholarship.id);
        if (id) {
            const link = textElement('a', 'Requirements, sources & applicant experiences', 'research-detail-link');
            link.href = 'scholarship.html?id=' + id;
            block.appendChild(link);
        }
        card.appendChild(block);
    }

    window.ScholarMatchDOM = {
        academicValue,
        appendResearch,
        cycleLabel,
        applyLink,
        clear,
        heartIcon,
        labeledLine,
        recordId,
        safeHttpUrl,
        textElement
    };
}());
