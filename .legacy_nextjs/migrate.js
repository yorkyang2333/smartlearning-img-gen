const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log("Starting migration...");
  
  // 1. Add new columns to Assignment if they don't exist
  // SQLite ALTER TABLE ADD COLUMN does not support adding multiple columns at once.
  // We'll wrap in a try-catch in case they already exist (though they shouldn't yet in SQLite, Prisma push hasn't run)
  const columnsToAdd = [
    { name: 'type', def: "TEXT DEFAULT 'STANDARD' NOT NULL" },
    { name: 'durationMin', def: "INTEGER" },
    { name: 'status', def: "TEXT" },
    { name: 'startedAt', def: "DATETIME" },
    { name: 'endedAt', def: "DATETIME" }
  ];

  columnsToAdd.forEach(col => {
    db.run(`ALTER TABLE Assignment ADD COLUMN ${col.name} ${col.def}`, (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error(`Error adding column ${col.name}:`, err.message);
      } else if (!err) {
        console.log(`Added column ${col.name} to Assignment.`);
      }
    });
  });

  // 2. Migrate Challenge to Assignment
  // Map: theme -> description, keywords -> requirements (as {"keywords": [...]})
  db.all("SELECT * FROM Challenge", (err, challenges) => {
    if (err) {
       if (err.message.includes("no such table")) {
           console.log("No Challenge table found, skipping migration.");
           db.close();
           return;
       }
       console.error("Error reading Challenge:", err);
       return;
    }

    if (challenges.length === 0) {
      console.log("No challenges to migrate.");
    } else {
      console.log(`Migrating ${challenges.length} challenges to assignments...`);
      const insertStmt = db.prepare(`
        INSERT INTO Assignment (id, teacherId, title, description, requirements, maxSubmissions, type, durationMin, status, startedAt, endedAt, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 1, 'CHALLENGE', ?, ?, ?, ?, 1, ?, ?)
      `);

      challenges.forEach(c => {
        let reqStr = null;
        if (c.keywords) {
          try {
             // keywords in Challenge was stored as stringified array
             const keywordsArr = JSON.parse(c.keywords);
             reqStr = JSON.stringify({ keywords: keywordsArr });
          } catch(e) {
             console.error("Error parsing keywords:", c.keywords);
          }
        }

        insertStmt.run(c.id, c.teacherId, c.title, c.theme, reqStr, c.durationMin, c.status, c.startedAt, c.endedAt, c.createdAt, c.createdAt, (err) => {
           if (err && !err.message.includes("UNIQUE constraint failed")) {
              console.error(`Error migrating challenge ${c.id}:`, err);
           }
        });
      });
      insertStmt.finalize();
      console.log("Challenge migration complete.");
    }

    // 3. Migrate ChallengeEntry to AssignmentSubmission
    db.all("SELECT * FROM ChallengeEntry", (err, entries) => {
      if (err) {
         console.error("Error reading ChallengeEntry:", err);
         return;
      }

      if (entries.length === 0) {
        console.log("No challenge entries to migrate.");
        db.close();
      } else {
        console.log(`Migrating ${entries.length} challenge entries to assignment submissions...`);
        const insertStmt = db.prepare(`
          INSERT INTO AssignmentSubmission (id, assignmentId, studentId, generationId, status, createdAt)
          VALUES (?, ?, ?, ?, 'SUBMITTED', ?)
        `);

        entries.forEach(e => {
          insertStmt.run(e.id, e.challengeId, e.studentId, e.generationId, e.submittedAt, (err) => {
             if (err && !err.message.includes("UNIQUE constraint failed")) {
                console.error(`Error migrating entry ${e.id}:`, err);
             }
          });
        });
        insertStmt.finalize();
        console.log("Challenge entry migration complete.");
        db.close();
      }
    });
  });
});
