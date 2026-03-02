const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { sql } = require("@vercel/postgres");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Crea la tabla automáticamente si no existe
async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS ratings (
      id         UUID PRIMARY KEY,
      stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      categories TEXT[],
      comment    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}
initDB().catch(console.error);

async function getStats() {
  const totals = await sql`
    SELECT COUNT(*)::int AS total, ROUND(AVG(stars)::numeric, 2)::float AS average FROM ratings
  `;
  const dist = await sql`
    SELECT stars, COUNT(*)::int AS count FROM ratings GROUP BY stars ORDER BY stars
  `;
  const cats = await sql`
    SELECT UNNEST(categories) AS name, COUNT(*)::int AS count
    FROM ratings WHERE categories IS NOT NULL
    GROUP BY name ORDER BY count DESC LIMIT 5
  `;
  const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  dist.rows.forEach(r => distribution[r.stars] = r.count);
  return {
    total: totals.rows[0].total,
    average: totals.rows[0].average || 0,
    distribution,
    topCategories: cats.rows
  };
}

app.post("/api/ratings", async (req, res) => {
  const { stars, categories, comment } = req.body;
  if (!stars || stars < 1 || stars > 5)
    return res.status(400).json({ success: false, error: "Stars debe ser entre 1 y 5." });

  const id = uuidv4();
  const cats = Array.isArray(categories) ? categories : [];
  const msg = typeof comment === "string" ? comment.trim().slice(0, 500) : "";

  await sql`INSERT INTO ratings (id, stars, categories, comment) VALUES (${id}, ${Math.round(stars)}, ${cats}, ${msg})`;

  return res.status(201).json({
    success: true,
    message: "¡Calificación registrada!",
    data: { id, stars: Math.round(stars), categories: cats, createdAt: new Date().toISOString() }
  });
});

app.get("/api/ratings", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const rows = await sql`SELECT id, stars, categories, comment, created_at FROM ratings ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const countRes = await sql`SELECT COUNT(*)::int AS total FROM ratings`;
  const total = countRes.rows[0].total;

  return res.json({
    success: true,
    data: rows.rows.map(r => ({ id: r.id, stars: r.stars, categories: r.categories, comment: r.comment, createdAt: r.created_at })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    stats: await getStats()
  });
});

app.get("/api/ratings/stats", async (req, res) => {
  return res.json({ success: true, data: await getStats() });
});

app.get("/api/ratings/:id", async (req, res) => {
  const result = await sql`SELECT * FROM ratings WHERE id = ${req.params.id}`;
  if (!result.rows.length) return res.status(404).json({ success: false, error: "No encontrada." });
  const r = result.rows[0];
  return res.json({ success: true, data: { id: r.id, stars: r.stars, categories: r.categories, comment: r.comment, createdAt: r.created_at } });
});

app.delete("/api/ratings/:id", async (req, res) => {
  const result = await sql`DELETE FROM ratings WHERE id = ${req.params.id} RETURNING id`;
  if (!result.rows.length) return res.status(404).json({ success: false, error: "No encontrada." });
  return res.json({ success: true, message: "Eliminada." });
});

app.get("/api/health", async (req, res) => {
  const c = await sql`SELECT COUNT(*)::int AS total FROM ratings`;
  return res.json({ success: true, status: "ok", db: "vercel-postgres", totalRatings: c.rows[0].total });
});

app.use("/api/*", (req, res) => res.status(404).json({ success: false, error: "Ruta no encontrada." }));

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => console.log("🚀 http://localhost:3000"));
}

module.exports = app;
