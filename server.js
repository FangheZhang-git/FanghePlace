require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { sessionSecurity } = require('./sessionSecurity');
const { contentSecurityPolicy } = require('./contentSecurity');
const { attachResearch, researchMatch } = require('./scholarshipResearch');
const { evaluateScholarship } = require('./scholarshipMatcher');

const { securityConfig, publicFiles, scalarBody, validateAuth, accountLimiter, captcha } = require('./security');
const security = securityConfig();
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const bcrypt = require('bcrypt');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
const sessions = sessionSecurity(db, security, JWT_SECRET);

const allowedOrigins = new Set([
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    ...(process.env.FRONTEND_ORIGIN || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
]);

function isAllowedOrigin(origin) {
    if (!origin || allowedOrigins.has(origin)) return true;

    try {
        const url = new URL(origin);
        return url.protocol === "http:" &&
            (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]");
    } catch {
        return false;
    }
}

app.disable("x-powered-by");
// Explicit proxy trust; hop counts require a deployment with no direct ingress bypass.
app.set("trust proxy", security.trustProxy);

app.use(helmet({
    contentSecurityPolicy: contentSecurityPolicy(__dirname, security.production)
}));
app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    }
}));
app.use(publicFiles(__dirname));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true,
    legacyHeaders: false, message: { message: 'Too many requests. Please try again shortly.' } }));
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
// CSP reports are bounded telemetry, never authenticated application writes.
app.post('/api/csp-report', express.json({ type: 'application/csp-report', limit: '8kb' }), (req, res) => {
    const report = req.body?.['csp-report'];
    if (report && typeof report['violated-directive'] === 'string') {
        const directive = report['violated-directive'].split(' ')[0].replace(/[^a-z-]/g, '').slice(0,40);
        let source = 'inline-or-unknown';
        try { source = new URL(report['blocked-uri']).origin; } catch {}
        console.warn('CSP blocked resource:', directive, source);
    }
    res.sendStatus(204);
});
app.use(sessions.protectWrites);
app.use(express.json({ limit: "50kb" }));
app.use(scalarBody);
app.use(require('./requestValidation').validateWrite);
app.get('/api/session', sessions.describe);
app.post('/logout', sessions.logout);
app.get('/api/security-config', (req, res) => res.json({ siteKey: security.siteKey }));
const verifyCaptcha = captcha(security);
const loginAccountLimiter = accountLimiter();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login or signup attempts. Please try again later." }
});

const commentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "You are posting comments too quickly. Please wait and try again." }
});

const submissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many scholarship submissions. Please try again later." }
});



function isValidHttpUrl(value) {
    if (value === null || value === undefined || value === "") return true;
    if (typeof value !== "string") return false;

    try {
        const url = new URL(value.trim());
        return Boolean(value.trim()) && (url.protocol === "http:" || url.protocol === "https:");
    } catch (error) {
        return false;
    }
}

function validateApplyUrl(value) {
    return isValidHttpUrl(value)
        ? null
        : "Application URL must be an absolute http:// or https:// URL";
}


(async () => {
    try {
        const connection = await db.getConnection();
        console.log("Connected to MySQL!");
        connection.release();
    } catch (err) {
        console.error("Database connection failed:", err);
    }
})();



const authenticateToken = sessions.authenticate;

function requireAdmin(req, res, next) {
    if (!req.user.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
}

app.get("/search", async (req, res) => {
    try {
        const query = req.query.query;
        if (query !== undefined && (typeof query !== 'string' || query.length > 200)) {
            return res.status(400).json({ message: 'Search must be at most 200 characters' });
        }

        if (!query || query.trim() === "") {
            return res.json([]);
        }

        const [rows] = await db.query(
            "SELECT * FROM scholarships WHERE name LIKE ?",
            [`%${query}%`]
        );

        res.json(await attachResearch(db, rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Search error" });
    }
});

//test route
app.get("/api/health", (req, res) => {
    res.json({ message: "Backend is working!!!" });
});
//test route
app.get('/protected', authenticateToken, (req, res) => {
    res.json({
        message: "You accessed protected data!",
        user: req.user
    });
});



app.post('/signup', authLimiter, validateAuth, verifyCaptcha, async (req, res) => {
    try {
        const { first_name, last_name, username, email, password } = req.body;

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            "INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)",
            [first_name, last_name, username, email, hashedPassword]
        );

        const userId = result.insertId;
        const sessionUser = await sessions.issue(req, res, { id: userId, username, is_admin: 0 });
        res.status(201).json({ message: "User created successfully", user: sessionUser });



    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating user" });
    }
});



app.post('/login', authLimiter, validateAuth, loginAccountLimiter, verifyCaptcha, async (req, res) => {
    try {
        const { email, password } = req.body;

        const [results] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (results.length === 0) {
            await bcrypt.compare(password, '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const sessionUser = await sessions.issue(req, res, user);
        res.json({ message: "Login successful", user: sessionUser });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


app.post('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            gpa, sat, act, citizenship, residency,
            gender, race, major,
            has_ap, ap_count, ap_high_scores,
            has_honors, honors_count,
            has_dual_enrollment, dual_enrollment_count,
            first_gen, leadership,
            income, household_size,
            award, willing_essay
        } = req.body;

        const sql = `
            INSERT INTO user_profiles (
                user_id, gpa, sat, act, citizenship, residency,
                gender, race, major,
                has_ap, ap_count, ap_high_scores,
                has_honors, honors_count,
                has_dual_enrollment, dual_enrollment_count,
                first_gen, leadership,
                income, household_size,
                award, willing_essay
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                gpa = VALUES(gpa),
                sat = VALUES(sat),
                act = VALUES(act),
                citizenship = VALUES(citizenship),
                residency = VALUES(residency),
                gender = VALUES(gender),
                race = VALUES(race),
                major = VALUES(major),
                has_ap = VALUES(has_ap),
                ap_count = VALUES(ap_count),
                ap_high_scores = VALUES(ap_high_scores),
                has_honors = VALUES(has_honors),
                honors_count = VALUES(honors_count),
                has_dual_enrollment = VALUES(has_dual_enrollment),
                dual_enrollment_count = VALUES(dual_enrollment_count),
                first_gen = VALUES(first_gen),
                leadership = VALUES(leadership),
                income = VALUES(income),
                household_size = VALUES(household_size),
                award = VALUES(award),
                willing_essay = VALUES(willing_essay)
        `;

        await db.query(sql, [
            userId,
            gpa, sat, act, citizenship, residency,
            gender, race, major,
            has_ap, ap_count, ap_high_scores,
            has_honors, honors_count,
            has_dual_enrollment, dual_enrollment_count,
            first_gen, leadership,
            income, household_size,
            award, willing_essay
        ]);

        res.json({ message: "Profile saved successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error saving profile" });
    }
});




app.get("/scholarships", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM scholarships");
        res.json(await attachResearch(db, rows));
    } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).json({ message: "Error fetching scholarships" });
    }
});


app.get('/api/scholarships/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({message:'Invalid scholarship ID'});
    const [rows] = await db.query('SELECT * FROM scholarships WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({message:'Scholarship not found'});
    res.json((await attachResearch(db, rows))[0]);
});

app.get("/match", authenticateToken, async (req, res) => {
    try {

        const userId = req.user.id;


        const [profiles] = await db.query(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [userId]
        );

        if (profiles.length === 0) {
            return res.status(400).json({ message: "Profile not found" });
        }

        const profile = profiles[0];


        const [scholarshipRows] = await db.query(
            "SELECT * FROM scholarships"
        );
        const scholarships = await attachResearch(db, scholarshipRows);


        const matched = scholarships
            .map(sch => {
                if (sch.research) {
                    return researchMatch(profile, sch);
                }
                const evaluation = evaluateScholarship(profile, sch);
                if (!evaluation.eligible) return null;
                return {
                    ...sch,
                    score: evaluation.score,
                    match_status: evaluation.match_status
                };
            })
            .filter(Boolean)
            .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

        res.json(matched);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Matching error" });
    }
});


//Create Admin Routes



//View all scholarships (admin only)
app.get('/admin/scholarships', authenticateToken, requireAdmin, async (req, res) => {
    const [rows] = await db.query("SELECT * FROM scholarships");
    res.json(await attachResearch(db, rows));
});

// add scholarships
app.post('/admin/scholarships', authenticateToken, requireAdmin, async (req, res) => {

    const {
        name,
        provider,
        min_amount,
        max_amount,
        min_gpa,
        min_sat,
        min_act,
        citizenship,
        state,
        major,
        requires_essay,
        first_gen_only,
        leadership,
        min_income,
        max_income,
        renewable,
        description,
        apply_url,
        deadline,
        advanced_coursework_preferred,
        award,
        race,
        type
    } = req.body;

    const urlError = validateApplyUrl(apply_url);
    if (urlError) return res.status(400).json({ message: urlError });

    await db.query(
        `INSERT INTO scholarships
    (
        name, provider, min_amount, max_amount, min_gpa, min_sat, min_act,
        citizenship, state, major, requires_essay, first_gen_only, leadership,
        min_income, max_income, renewable, description, apply_url, deadline,
        advanced_coursework_preferred, award, race, type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, provider, min_amount, max_amount, min_gpa, min_sat, min_act,
            citizenship, state, major, requires_essay, first_gen_only, leadership,
            min_income, max_income, renewable, description, apply_url, deadline,
            advanced_coursework_preferred, award, race, type
        ]
    );

    res.json({ message: "Scholarship created" });
});

// Edit Scholarships
app.get('/admin/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    const [rows] = await db.query(
        "SELECT * FROM scholarships WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Scholarship not found" });
    }

    res.json(rows[0]);
});




app.delete('/admin/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    await db.query("DELETE FROM scholarships WHERE id = ?", [id]);

    res.json({ message: "Scholarship deleted" });
});


//PUT route for editing.
app.put('/admin/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    const {
        name,
        provider,
        min_amount,
        max_amount,
        min_gpa,
        min_sat,
        min_act,
        citizenship,
        state,
        major,
        requires_essay,
        first_gen_only,
        leadership,
        min_income,
        max_income,
        renewable,
        description,
        apply_url,
        deadline,
        advanced_coursework_preferred,
        award,
        race,
        type
    } = req.body;

    const urlError = validateApplyUrl(apply_url);
    if (urlError) return res.status(400).json({ message: urlError });

    await db.query(
        `UPDATE scholarships
     SET
        name=?,
        provider=?,
        min_amount=?,
        max_amount=?,
        min_gpa=?,
        min_sat=?,
        min_act=?,
        citizenship=?,
        state=?,
        major=?,
        requires_essay=?,
        first_gen_only=?,
        leadership=?,
        min_income=?,
        max_income=?,
        renewable=?,
        description=?,
        apply_url=?,
        deadline=?,
        advanced_coursework_preferred=?,
        award=?,
        race=?,
        type=?
     WHERE id=?`,
        [
            name,
            provider,
            min_amount,
            max_amount,
            min_gpa,
            min_sat,
            min_act,
            citizenship,
            state,
            major,
            requires_essay,
            first_gen_only,
            leadership,
            min_income,
            max_income,
            renewable,
            description,
            apply_url,
            deadline,
            advanced_coursework_preferred,
            award,
            race,
            type,
            id
        ]);

    const [updated] = await db.query(
        "SELECT * FROM scholarships WHERE id = ?",
        [id]
    );

    res.json(updated[0]);

});




app.get("/profile", authenticateToken, async (req, res) => {

    const userId = req.user.id;

    const sql = `
  SELECT
    u.first_name,
    u.last_name,
    u.email,
    up.*
  FROM users u
  LEFT JOIN user_profiles up
  ON u.id = up.user_id
  WHERE u.id = ?
  ORDER BY up.created_at DESC
  LIMIT 1
  `;

    const [rows] = await db.query(sql, [userId]);

    res.json(rows[0]);

});



//three APIs for saved scholarships
app.post("/toggle-save", authenticateToken, async (req, res) => {

    const userId = req.user.id
    const { scholarship_id } = req.body

    const [rows] = await db.query(
        `SELECT * FROM saved_scholarships
         WHERE user_id=? AND scholarship_id=?`,
        [userId, scholarship_id]
    )

    if (rows.length) {

        await db.query(
            `DELETE FROM saved_scholarships
             WHERE user_id=? AND scholarship_id=?`,
            [userId, scholarship_id]
        )

        res.json({ saved: false })

    } else {

        await db.query(
            `INSERT INTO saved_scholarships
             (user_id, scholarship_id)
             VALUES (?,?)`,
            [userId, scholarship_id]
        )

        res.json({ saved: true })
    }

})

app.get("/saved-ids", authenticateToken, async (req, res) => {

    const userId = req.user.id

    const [rows] = await db.query(
        `SELECT scholarship_id
         FROM saved_scholarships
         WHERE user_id=?`,
        [userId]
    )

    res.json(rows)

})

app.get("/saved-scholarships", authenticateToken, async (req, res) => {

    const userId = req.user.id

    const [rows] = await db.query(`
        SELECT s.*
        FROM scholarships s
        JOIN saved_scholarships ss
        ON s.id = ss.scholarship_id
        WHERE ss.user_id=?
    `, [userId])

    res.json(await attachResearch(db, rows))

})

//comment function (POST Comment)

app.post("/scholarships/:id/comment", commentLimiter, authenticateToken, async (req, res) => {
    try {

        const scholarshipId = req.params.id;
        const user_id = req.user.id;
        if (typeof req.body.comment !== 'string') return res.status(400).json({ message: 'Comment must be text' });
        const comment = req.body.comment.trim();

        if (!comment) {
            return res.status(400).json({
                message: "Comment cannot be empty"
            });
        }

        const [todayComments] = await db.query(
            `SELECT COUNT(*) AS comment_count
             FROM scholarship_comments
             WHERE user_id = ?
             AND DATE(created_at) = CURRENT_DATE`,
            [user_id]
        );

        if (todayComments[0].comment_count >= 2) {
            return res.status(429).json({
                message: "You can only post 2 comments per day."
            });
        }

        await db.query(
            `INSERT INTO scholarship_comments 
            (scholarship_id, user_id, comment)
            VALUES (?, ?, ?)`,
            [scholarshipId, user_id, comment]
        );

        res.json({ message: "Comment added" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//comment function (GET Comment)

app.get("/scholarships/:id/comments", async (req, res) => {
    try {

        const scholarshipId = req.params.id;

        const [comments] = await db.query(
            `SELECT 
                scholarship_comments.comment,
                scholarship_comments.created_at,
                users.username
            FROM scholarship_comments
            JOIN users ON scholarship_comments.user_id = users.id
            WHERE scholarship_comments.scholarship_id = ?
            ORDER BY created_at DESC`,
            [scholarshipId]
        );

        res.json(comments);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// get comments written by the authenticated user

app.get("/my-comments", authenticateToken, async (req, res) => {
    try {

        const userId = req.user.id;

        const [comments] = await db.query(
            `SELECT 
                scholarship_comments.comment,
                scholarship_comments.created_at,
                scholarships.name AS scholarship_name,
                scholarships.id AS scholarship_id
            FROM scholarship_comments
            JOIN scholarships 
            ON scholarship_comments.scholarship_id = scholarships.id
            WHERE scholarship_comments.user_id = ?
            ORDER BY scholarship_comments.created_at DESC`,
            [userId]
        );

        res.json(comments);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// for user submission
function emptyToNull(value) {
    return value === "" || value === undefined ? null : value;
}

function normalizeScholarshipData(input) {
    const data = Object.fromEntries(
        Object.entries(input).map(([key, value]) => [key, emptyToNull(value)])
    );

    return {
        name: data.name,
        provider: data.provider,
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        min_gpa: data.min_gpa,
        min_sat: data.min_sat,
        min_act: data.min_act,
        citizenship: data.citizenship,
        state: data.state,
        major: data.major,
        requires_essay: data.requires_essay,
        first_gen_only: data.first_gen_only,
        leadership: data.leadership,
        min_income: data.min_income,
        max_income: data.max_income,
        renewable: data.renewable,
        description: data.description,
        apply_url: data.apply_url,
        deadline: data.deadline,
        advanced_coursework_preferred: data.advanced_coursework_preferred,
        award: data.award,
        race: data.race,
        type: data.type
    };
}

function scholarshipValues(data) {
    return [
        data.name,
        data.provider,
        data.min_amount,
        data.max_amount,
        data.min_gpa,
        data.min_sat,
        data.min_act,
        data.citizenship,
        data.state,
        data.major,
        data.requires_essay,
        data.first_gen_only,
        data.leadership,
        data.min_income,
        data.max_income,
        data.renewable,
        data.description,
        data.apply_url,
        data.deadline,
        data.advanced_coursework_preferred,
        data.award,
        data.race,
        data.type
    ];
}

const scholarshipColumns = `
    name, provider, min_amount, max_amount, min_gpa, min_sat, min_act,
    citizenship, state, major, requires_essay, first_gen_only, leadership,
    min_income, max_income, renewable, description, apply_url, deadline,
    advanced_coursework_preferred, award, race, type
`;

function validateSubmittedScholarship(data) {
    if (!data.name || !data.name.trim()) {
        return "Scholarship name is required";
    }

    if (data.min_amount === null || data.max_amount === null) {
        return "Min amount and max amount are required";
    }

    const urlError = validateApplyUrl(data.apply_url);
    if (urlError) return urlError;

    return null;
}

app.post('/submit-scholarship', submissionLimiter, authenticateToken, async (req, res) => {

    try {

        const user_id = req.user.id;
        const user_email = req.user.email;

        const data = normalizeScholarshipData(req.body);
        const validationError = validateSubmittedScholarship(data);

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        await db.query(
            `INSERT INTO scholarship_submissions
            (
                user_id, user_email, ${scholarshipColumns}
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id, user_email, ...scholarshipValues(data)
            ]
        );

        res.json({ message: "Submission received and pending review." });

    } catch (err) {

        console.error(err);

        res.status(500).json({ error: "Database error" });

    }

});


//route for admin to see pending submissions

app.get('/admin/submissions', authenticateToken, requireAdmin, async (req, res) => {

    const [rows] = await db.query(
        `SELECT *
         FROM scholarship_submissions
         WHERE status = 'pending'
         ORDER BY created_at DESC`
    );

    res.json(rows);

});

//route for admin to load one submission

app.get('/admin/submissions/:id', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    const [rows] = await db.query(
        "SELECT * FROM scholarship_submissions WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Submission not found" });
    }

    res.json(rows[0]);

});


//route to approve a submission

app.post('/admin/submissions/:id/approve', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            "SELECT * FROM scholarship_submissions WHERE id = ? FOR UPDATE",
            [id]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Submission not found" });
        }

        const submission = rows[0];

        if (submission.status !== "pending") {
            await connection.rollback();
            return res.status(409).json({ message: `Submission is already ${submission.status}.` });
        }

        const data = normalizeScholarshipData(submission);
        const validationError = validateSubmittedScholarship(data);

        if (validationError) {
            await connection.rollback();
            return res.status(400).json({ message: validationError });
        }

        await connection.query(
            `INSERT INTO scholarships (${scholarshipColumns})
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            scholarshipValues(data)
        );

        await connection.query(
            "UPDATE scholarship_submissions SET status='approved', reviewed_at=NOW(), reviewed_by=? WHERE id=?",
            [req.user.id, id]
        );

        await connection.commit();

        res.json({ message: "Submission approved and added." });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Error approving submission" });
    } finally {
        connection.release();
    }

});

// route to reject submission

app.post('/admin/submissions/:id/reject', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    await db.query(
        "UPDATE scholarship_submissions SET status='rejected', reviewed_at=NOW(), reviewed_by=? WHERE id=?",
        [req.user.id, id]
    );

    res.json({ message: "Submission rejected." });

});

app.get('/my-submissions', authenticateToken, async (req, res) => {

    const user_id = req.user.id;

    const [rows] = await db.query(
        `SELECT id, name, status, created_at
         FROM scholarship_submissions
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [user_id]
    );

    res.json(rows);

});


app.put('/admin/submissions/:id', authenticateToken, requireAdmin, async (req, res) => {

    try {
        const id = req.params.id;
        const data = normalizeScholarshipData(req.body);
        const validationError = validateSubmittedScholarship(data);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const [result] = await db.query(
            `UPDATE scholarship_submissions
             SET ${scholarshipColumns
                .split(",")
                .map(column => `${column.trim()}=?`)
                .join(", ")}
             WHERE id=? AND status='pending'`,
            [
                ...scholarshipValues(data),
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Pending submission not found" });
        }

        res.json({ message: "Submission updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating submission" });
    }

});






//start server
const PORT = process.env.PORT || 5000;

app.use((err, req, res, next) => {
    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "CORS origin not allowed" });
    }

    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ message: "Server error" });
});

const HOST = security.host;
sessions.initialize().then(() => {
    const server = app.listen(PORT, HOST, () => {
        console.log(`Server running on port ${PORT}`);
    });
    server.requestTimeout = 30000;
    server.headersTimeout = 10000;
    const cleanup = setInterval(() => {
        db.query('DELETE FROM web_sessions WHERE expires_at <= UTC_TIMESTAMP()')
            .catch(() => console.error('Expired-session cleanup failed'));
    }, 15 * 60 * 1000);
    cleanup.unref();
}).catch(() => {
    console.error('Session storage initialization failed. Check the database connection and migration permissions.');
    process.exitCode = 1;
    db.end();
});
