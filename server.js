require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require('jsonwebtoken');

const JWT_SECRET = "super_secret_key_change_this";

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

function calculateScore(profile, sch) {

    if (sch.min_gpa && profile.gpa < sch.min_gpa) return null;
    if (sch.min_sat && profile.sat < sch.min_sat) return null;
    if (sch.min_act && profile.act < sch.min_act) return null;

    if (sch.leadership_required && !profile.leadership) return null;
    if (sch.requires_essay && !profile.willing_essay) return null;

    let score = 0;

    // GPA weight
    if (profile.gpa) {
        score += profile.gpa * 10;
    }

    // SAT weight
    if (profile.sat) {
        score += profile.sat / 100;
    }

    // Leadership BONUS
    if (profile.leadership) {
        score += 10;
    }

    // Advanced coursework BONUS
    if (sch.advanced_coursework_preferred && profile.has_ap) {
        score += 5;
    }

    return score;
}



//easy test route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!!!" });
});

app.get('/protected', authenticateToken, (req, res) => {
    res.json({
        message: "You accessed protected data!",
        user: req.user
    });
});



app.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
        await db.query(sql, [email, hashedPassword]);

        res.json({ message: "User created successfully" });

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
            { id: user.id, email: user.email },
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









//start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
