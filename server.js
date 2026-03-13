require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const bcrypt = require('bcrypt');


app.use(cors());
app.use(express.json());



const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


(async () => {
    try {
        const connection = await db.getConnection();
        console.log("Connected to MySQL!");
        connection.release();
    } catch (err) {
        console.error("Database connection failed:", err);
    }
})();



function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token." });
        }

        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
}

function calculateScore(profile, sch) {
    let score = 0;

    // ---------- HARD FILTERS (must satisfy) ----------

    if (sch.min_gpa && profile.gpa !== null && profile.gpa < sch.min_gpa) {
        return null;
    }

    if (sch.min_sat && profile.sat !== null && profile.sat < sch.min_sat) {
        return null;
    }

    if (sch.min_act && profile.act !== null && profile.act < sch.min_act) {
        return null;
    }

    // citizenship exact match if scholarship requires one
    if (sch.citizenship && profile.citizenship && sch.citizenship !== profile.citizenship) {
        return null;
    }

    // state match if scholarship is state-specific
    if (sch.state && profile.residency && sch.state !== profile.residency) {
        return null;
    }

    // major match if scholarship specifies a major
    if (sch.major && profile.major && sch.major !== profile.major) {
        return null;
    }

    // essay required
    if (sch.requires_essay === 1 && profile.willing_essay !== 1) {
        return null;
    }

    // first-generation required
    if (sch.first_gen_only === 1 && profile.first_gen !== 1) {
        return null;
    }

    // leadership required
    if (sch.leadership === "required" && profile.leadership !== 1) {
        return null;
    }

    // award required
    if (sch.award === "required" && profile.award !== 1) {
        return null;
    }

    // race restriction
    if (sch.race && sch.race !== "any" && profile.race && sch.race !== profile.race) {
        return null;
    }

    // max income
    if (sch.max_income && profile.income !== null && profile.income > sch.max_income) {
        return null;
    }

    // min income
    if (sch.min_income && profile.income !== null && profile.income < sch.min_income) {
        return null;
    }

    // ---------- SCORING ----------

    if (profile.gpa) {
        score += profile.gpa * 10;
    }

    if (profile.sat) {
        score += profile.sat / 100;
    }

    if(profile.sat >= 1500){
        score += 20;
    }

    if (profile.act) {
        score += profile.act / 2;
    }

    // AP / honors / advanced coursework
    if (profile.has_ap === 1) {
        score += 5;
    }

    if (profile.ap_high_scores) {
        score += profile.ap_high_scores * 2;
    }

    if (profile.has_honors === 1) {
        score += 3;
    }

    if (sch.advanced_coursework_preferred === 1) {
        if (profile.has_ap === 1 || profile.has_honors === 1 || profile.has_dual_enrollment === 1) {
            score += 8;
        }
    }

    // leadership preferred
    if (sch.leadership === "preferred" && profile.leadership === 1) {
        score += 10;
    }

    // award preferred
    if (sch.award === "preferred" && profile.award === 1) {
        score += 10;
    }

    // first-gen bonus
    if (profile.first_gen === 1) {
        score += 5;
    }

    // merit / need type bonus
    if (sch.type === "pure_merit_based") {
        if (profile.gpa >= 3.7) score += 8;
        if (profile.sat >= 1450 || profile.act >= 32) score += 8;
    }

    if (sch.type === "pure_need_based") {
        if (profile.income !== null && profile.income <= 60000) score += 12;
    }

    if (sch.type === "merit_plus_need") {
        if (profile.income !== null && profile.income <= 80000) score += 8;
        if (profile.gpa >= 3.4) score += 6;
    }

    return score;
}

app.get("/search", async (req, res) => {
    try {
        const query = req.query.query;

        if (!query || query.trim() === "") {
            return res.json([]);
        }

        const [rows] = await db.query(
            "SELECT * FROM scholarships WHERE name LIKE ?",
            [`%${query}%`]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Search error" });
    }
});

//test route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!!!" });
});
//test route
app.get('/protected', authenticateToken, (req, res) => {
    res.json({
        message: "You accessed protected data!",
        user: req.user
    });
});



app.post('/signup', async (req, res) => {
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
        const token = jwt.sign(
            { id: userId, email: email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "User created successfully",
            token: token
        });



    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating user" });
    }
});



app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [results] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (results.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token
        });

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
        res.json(rows);
    } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).json({ message: "Error fetching scholarships" });
    }
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


        const [scholarships] = await db.query(
            "SELECT * FROM scholarships"
        );


        const matched = scholarships
            .map(sch => {
                const score = calculateScore(profile, sch);
                if (score === null) return null;

                return { ...sch, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);

        res.json(matched);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Matching error" });
    }
});


//Phase 3 — Create Admin Routes (CRUD)

//We will build clean REST-style admin routes.


//View all scholarships (admin only)
app.get('/admin/scholarships', authenticateToken, requireAdmin, async (req, res) => {
    const [rows] = await db.query("SELECT * FROM scholarships");
    res.json(rows);
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

// POST   /toggle-save
// GET    /saved-scholarships
// GET    /saved-ids
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

    res.json(rows)

})


//comment function (POST Comment)

app.post("/scholarships/:id/comment", async (req, res) => {
    try {

        const scholarshipId = req.params.id;
        const { user_id, comment } = req.body;

        if (!user_id || !comment || !comment.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty"
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



// get comments written by this user

app.get("/users/:id/comments", async (req, res) => {
    try {

        const userId = req.params.id;

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


//POST route for user to submitt scholarships

// convert empty string to null


app.post('/submit-scholarship', authenticateToken, async (req, res) => {

    try {

        const user_id = req.user.id;
        const user_email = req.user.email;

        const data = Object.fromEntries(
            Object.entries(req.body).map(([k, v]) => [k, v === "" ? null : v])
        );

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
        } = data;

        await db.query(
            `INSERT INTO scholarship_submissions
            (
                user_id, user_email,
                name, provider, min_amount, max_amount, min_gpa, min_sat, min_act,
                citizenship, state, major, requires_essay, first_gen_only, leadership,
                min_income, max_income, renewable, description, apply_url, deadline,
                advanced_coursework_preferred, award, race, type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id, user_email,
                name, provider, min_amount, max_amount, min_gpa, min_sat, min_act,
                citizenship, state, major, requires_essay, first_gen_only, leadership,
                min_income, max_income, renewable, description, apply_url, deadline,
                advanced_coursework_preferred, award, race, type
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

    await db.query(
        "UPDATE scholarship_submissions SET status='approved' WHERE id=?",
        [id]
    );

    res.json({ message: "Submission approved and added." });

});

// route to reject submission

app.post('/admin/submissions/:id/reject', authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    await db.query(
        "UPDATE scholarship_submissions SET status='rejected' WHERE id=?",
        [id]
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

    const id = req.params.id;
    const data = req.body;

    await db.query(
        `UPDATE scholarship_submissions
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
            award=?,
            deadline=?,
            type=?,
            description=?,
            min_income=?,
            max_income=?,
            renewable=?,
            advanced_coursework_preferred=?,
            race=?,
            apply_url=?
         WHERE id=?`,
        [
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
            data.award,
            data.deadline,
            data.type,
            data.description,
            data.min_income,
            data.max_income,
            data.renewable,
            data.advanced_coursework_preferred,
            data.race,
            data.apply_url,
            id
        ]
    );

    res.json({ message: "Submission updated successfully" });

});






//start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
