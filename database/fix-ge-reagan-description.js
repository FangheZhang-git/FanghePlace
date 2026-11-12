require('dotenv').config();
const mysql = require('mysql2/promise');

const name = 'GE-Reagan Foundation Scholarship Program';
const oldText = 'Awards are renewable up to ,000 total';
const newText = 'Awards are renewable up to $40,000 total';

async function main() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await db.execute(
            'SELECT id, description FROM scholarships WHERE name = ?',
            [name]
        );
        if (rows.length !== 1) throw new Error(`Expected one scholarship, found ${rows.length}`);

        const { id, description } = rows[0];
        if (description.includes(newText) && !description.includes(oldText)) {
            console.log(`Scholarship ${id} already has the corrected description.`);
            return;
        }
        if (description.split(oldText).length !== 2) {
            throw new Error('Description does not contain exactly one expected typo.');
        }

        const corrected = description.replace(oldText, newText);
        const [result] = await db.execute(
            'UPDATE scholarships SET description = ? WHERE id = ? AND description = ?',
            [corrected, id, description]
        );
        if (result.affectedRows !== 1) throw new Error('Scholarship changed before update; no correction applied.');

        const [verified] = await db.execute('SELECT description FROM scholarships WHERE id = ?', [id]);
        if (verified[0]?.description !== corrected) throw new Error('Description verification failed.');
        console.log(`Corrected and verified scholarship ${id}.`);
    } finally {
        await db.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
