const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ─── In-Memory Store (reemplazar con DB en producción) ───────────────────────
// Para producción usa: Vercel Postgres, PlanetScale, Supabase, MongoDB Atlas, etc.
let ratings = [];

// ─── Helper: calcular estadísticas ───────────────────────────────────────────
function getStats() {
  if (ratings.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      topCategories: [],
    };
  }

  const total = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
  const average = parseFloat((sum / total).toFixed(2));

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => distribution[r.stars]++);

  const catCount = {};
  ratings.forEach((r) => {
    (r.categories || []).forEach((c) => {
      catCount[c] = (catCount[c] || 0) + 1;
    });
  });
  const topCategories = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { total, average, distribution, topCategories };
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// POST /api/ratings — Enviar nueva calificación
app.post("/api/ratings", (req, res) => {
  const { stars, categories, comment } = req.body;

  // Validación
  if (!stars || typeof stars !== "number" || stars < 1 || stars > 5) {
    return res.status(400).json({
      success: false,
      error: "El campo 'stars' es requerido y debe ser un número entre 1 y 5.",
    });
  }

  const newRating = {
    id: uuidv4(),
    stars: Math.round(stars),
    categories: Array.isArray(categories) ? categories : [],
    comment: typeof comment === "string" ? comment.trim().slice(0, 500) : "",
    createdAt: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress,
  };

  ratings.push(newRating);

  return res.status(201).json({
    success: true,
    message: "¡Calificación registrada exitosamente!",
    data: {
      id: newRating.id,
      stars: newRating.stars,
      categories: newRating.categories,
      createdAt: newRating.createdAt,
    },
  });
});

// GET /api/ratings — Obtener todas las calificaciones (paginado)
app.get("/api/ratings", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const sortedRatings = [...ratings].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const paginated = sortedRatings.slice(offset, offset + limit).map((r) => ({
    id: r.id,
    stars: r.stars,
    categories: r.categories,
    comment: r.comment,
    createdAt: r.createdAt,
  }));

  return res.json({
    success: true,
    data: paginated,
    pagination: {
      total: ratings.length,
      page,
      limit,
      totalPages: Math.ceil(ratings.length / limit),
    },
    stats: getStats(),
  });
});

// GET /api/ratings/stats — Solo estadísticas
app.get("/api/ratings/stats", (req, res) => {
  return res.json({
    success: true,
    data: getStats(),
  });
});

// GET /api/ratings/:id — Obtener calificación por ID
app.get("/api/ratings/:id", (req, res) => {
  const rating = ratings.find((r) => r.id === req.params.id);
  if (!rating) {
    return res.status(404).json({ success: false, error: "Calificación no encontrada." });
  }
  const { ip, ...safe } = rating;
  return res.json({ success: true, data: safe });
});

// DELETE /api/ratings/:id — Eliminar calificación (requeriría auth en producción)
app.delete("/api/ratings/:id", (req, res) => {
  const index = ratings.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Calificación no encontrada." });
  }
  ratings.splice(index, 1);
  return res.json({ success: true, message: "Calificación eliminada." });
});

// GET /api/health — Health check
app.get("/api/health", (req, res) => {
  return res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    totalRatings: ratings.length,
  });
});

// 404 fallback para /api/*
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada." });
});

// ─── Start server (solo para desarrollo local) ───────────────────────────────
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 SmartFlow Rating API corriendo en http://localhost:${PORT}`);
    console.log(`\n📋 Endpoints disponibles:`);
    console.log(`   POST   http://localhost:${PORT}/api/ratings`);
    console.log(`   GET    http://localhost:${PORT}/api/ratings`);
    console.log(`   GET    http://localhost:${PORT}/api/ratings/stats`);
    console.log(`   GET    http://localhost:${PORT}/api/ratings/:id`);
    console.log(`   DELETE http://localhost:${PORT}/api/ratings/:id`);
    console.log(`   GET    http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
