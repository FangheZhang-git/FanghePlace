(function () {
    const dom = window.ScholarMatchDOM;
    const directory = document.getElementById('researchDirectory');
    const detail = document.getElementById('researchDetail');
    const numericFields = ['min_amount','max_amount','min_gpa','min_sat','min_act','min_income','max_income'];

    function amount(s) {
        if (s.min_amount === s.max_amount && s.min_amount !== null) return '$' + s.min_amount;
        if (s.min_amount != null && s.max_amount != null) return '$' + s.min_amount + '–$' + s.max_amount;
        if (s.max_amount != null) return 'Up to $' + s.max_amount;
        if (s.min_amount != null) return 'From $' + s.min_amount;
        return 'Not published';
    }

    function list(parent, title, values) {
        if (!Array.isArray(values) || !values.length) return;
        parent.appendChild(dom.textElement('h3', title));
        const ul = document.createElement('ul');
        values.forEach(value => ul.appendChild(dom.textElement('li', value)));
        parent.appendChild(ul);
    }

    function renderDetail(s) {
        document.title = (s.name || 'Scholarship') + ' | ScholarMatch';
        detail.replaceChildren(dom.textElement('h2', s.name), dom.labeledLine('Provider', s.provider),
            dom.textElement('p', s.description), dom.labeledLine('Award', amount(s)));
        const r = s.research;
        if (r) {
            detail.appendChild(dom.textElement('p', dom.cycleLabel(s), 'research-status'));
            detail.appendChild(dom.labeledLine('Checked', r.checked_on));
            detail.appendChild(dom.labeledLine('Cycle details', r.cycle_notes || s.deadline));
            if (r.stale) detail.appendChild(dom.textElement('p', 'The scholarship was edited after this research. Historical research notes below may no longer describe the current listing. Recheck the provider.', 'research-status'));
            detail.appendChild(dom.labeledLine('Award basis', r.award_basis));
            detail.appendChild(dom.labeledLine('GPA', dom.academicValue(s.min_gpa) + '. ' + r.gpa_notes));
            detail.appendChild(dom.labeledLine('SAT', dom.academicValue(s.min_sat) + '. ' + r.sat_notes));
            detail.appendChild(dom.labeledLine('ACT', dom.academicValue(s.min_act) + '. ' + r.act_notes));
            detail.appendChild(dom.textElement('p', 'Accepted-applicant GPA, SAT/ACT ranges and acceptance rates were not established. Recipient stories do not create eligibility cutoffs.'));
            for (const [label,key] of [['Citizenship','citizenship_notes'],['Residence','residency_notes'],['Renewal','renewal_notes']]) {
                if (r[key]) detail.appendChild(dom.labeledLine(label,r[key]));
            }
            list(detail, 'Who can apply', r.requirements);
            list(detail, 'Application materials', r.materials);
            list(detail, 'How recipients are selected', r.selection);
            list(detail, 'Confirm before applying', r.manual_checks);
            detail.appendChild(dom.textElement('h3', 'Reputation and evidence'));
            detail.appendChild(dom.textElement('p', r.reputation));
            detail.appendChild(dom.textElement('h3', 'Applicant and recipient experiences'));
            if (!r.experiences.length) detail.appendChild(dom.textElement('p', 'No reliable firsthand experience was verified.'));
            for (const experience of r.experiences) {
                detail.appendChild(dom.labeledLine(experience.kind.replace(/_/g,' '),experience.text));
                const link = dom.applyLink(experience.url, 'research-source', 'Read account');
                if (link) detail.appendChild(link);
            }
            detail.appendChild(dom.textElement('h3', 'Research sources'));
            const sources = document.createElement('ul');
            for (const source of r.sources) {
                const item = document.createElement('li');
                const link = dom.applyLink(source.url, 'research-source', source.kind.replace(/_/g,' ') + ': ' + source.url);
                if (link) item.appendChild(link);
                sources.appendChild(item);
            }
            detail.appendChild(sources);
        }
        const records = document.createElement('details');
        records.appendChild(dom.textElement('summary','All recorded matching fields'));
        const labels = {min_amount:'Minimum award',max_amount:'Maximum award',min_gpa:'Minimum GPA',min_sat:'Minimum SAT',min_act:'Minimum ACT',citizenship:'Citizenship',state:'State',major:'Major',requires_essay:'Essay required',first_gen_only:'First-generation only',leadership:'Leadership',min_income:'Minimum income',max_income:'Maximum income',renewable:'Renewable',deadline:'Deadline',advanced_coursework_preferred:'Advanced coursework preferred',award:'Prior awards',race:'Race',type:'Scholarship type'};
        const table = document.createElement('table');
        for (const [key,label] of Object.entries(labels)) {
            const row = document.createElement('tr');
            const th = dom.textElement('th',label); th.scope='row'; row.appendChild(th);
            let value = s[key];
            if (value != null && numericFields.includes(key)) value = Number(value);
            row.appendChild(dom.textElement('td',value ?? '')); table.appendChild(row);
        }
        records.appendChild(table);
        records.appendChild(dom.textElement('p','Blank = unknown or not representable by one value; see the conditions above. Academic zero = explicitly no minimum/not considered. Boolean 0 = no, 1 = yes.'));
        detail.appendChild(records);
        const link = dom.applyLink(s.apply_url, 'research-provider-link', 'Visit official provider →');
        if (link) detail.appendChild(link);
    }

    async function load() {
        if (directory) {
            const status = document.getElementById('directoryStatus');
            try {
                const response = await ScholarMatchSession.request('/scholarships');
                if (!response.ok) throw new Error('Could not load scholarships.');
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('Invalid scholarship response.');
                const scholarships = data.filter(s => s.research);
                const filter = document.getElementById('scholarshipFilter');
                function render() {
                    const query = filter.value.trim().toLowerCase();
                    const shown = scholarships.filter(s => (s.name+' '+s.description+' '+s.research.requirements.join(' ')).toLowerCase().includes(query));
                    directory.replaceChildren();
                    status.textContent = shown.length + ' researched scholarships';
                    for (const s of shown) {
                        const card = dom.textElement('article','','scholarship-card');
                        const title = dom.textElement('h3',s.name);
                        card.append(title,dom.labeledLine('Award',amount(s)),dom.textElement('p',s.description));
                        dom.appendResearch(card,s);
                        directory.appendChild(card);
                    }
                }
                filter.addEventListener('input',render); render();
            } catch (error) { status.textContent = 'Unable to load scholarships. Please try again later.'; }
        }
        if (detail) {
            const status = document.getElementById('detailStatus');
            const id = dom.recordId(new URLSearchParams(location.search).get('id'));
            if (!id) { status.textContent='Choose a valid scholarship from the directory.'; return; }
            try {
                const response=await ScholarMatchSession.request('/api/scholarships/'+id);
                if (!response.ok) throw new Error('Scholarship unavailable.');
                renderDetail(await response.json()); status.textContent='';
            } catch (error) { status.textContent='Scholarship unavailable. Return to the directory and try again.'; }
        }
    }
    load();
}());
