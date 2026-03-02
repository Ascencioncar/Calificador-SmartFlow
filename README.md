# SmartFlow Rating — Backend Node.js + Vercel

Sistema de calificaciones con estrella para SmartFlow Automatización.

## 🗂 Estructura del proyecto

```
smartflow-rating/
├── api/
│   └── index.js        ← Express API (serverless en Vercel)
├── public/
│   └── index.html      ← Frontend del calificador
├── vercel.json         ← Configuración de rutas para Vercel
├── package.json
└── README.md
```

## 📡 Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/ratings` | Enviar nueva calificación |
| `GET` | `/api/ratings` | Listar calificaciones (paginado) |
| `GET` | `/api/ratings/stats` | Obtener estadísticas |
| `GET` | `/api/ratings/:id` | Obtener calificación por ID |
| `DELETE` | `/api/ratings/:id` | Eliminar calificación |
| `GET` | `/api/health` | Health check |

### Ejemplo: Enviar calificación
```json
POST /api/ratings
{
  "stars": 5,
  "categories": ["Automatización", "Velocidad"],
  "comment": "Excelente plataforma, muy fácil de usar."
}
```

### Ejemplo: Respuesta
```json
{
  "success": true,
  "message": "¡Calificación registrada exitosamente!",
  "data": {
    "id": "uuid-generado",
    "stars": 5,
    "categories": ["Automatización", "Velocidad"],
    "createdAt": "2026-03-01T12:00:00.000Z"
  }
}
```

---

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub (recomendado)

1. **Sube el proyecto a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: SmartFlow Rating inicial"
   git remote add origin https://github.com/TU_USUARIO/smartflow-rating.git
   git push -u origin main
   ```

2. **Conecta con Vercel:**
   - Entra a [vercel.com](https://vercel.com) → **Add New Project**
   - Importa el repositorio de GitHub
   - Haz clic en **Deploy** (Vercel detecta automáticamente la config)

3. **¡Listo!** Tu app estará en: `https://smartflow-rating.vercel.app`

---

### Opción 2: Vercel CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Dentro de la carpeta del proyecto:
vercel login
vercel

# Para producción:
vercel --prod
```

---

## 💾 Persistencia de datos (importante para producción)

El almacenamiento actual es **en memoria** y se borrará con cada redeploy.

Para persistir datos, reemplaza el array `ratings` en `api/index.js` con una base de datos:

| Opción | Plan gratuito | Integración |
|--------|---------------|-------------|
| **Vercel Postgres** | ✅ Hobby | Nativo en Vercel |
| **Supabase** | ✅ Free | PostgreSQL + REST |
| **MongoDB Atlas** | ✅ Free 512MB | mongoose |
| **PlanetScale** | ✅ Free | MySQL serverless |

### Ejemplo con Vercel Postgres:
```bash
vercel env add DATABASE_URL
```

```js
// En api/index.js reemplaza el array por:
const { sql } = require('@vercel/postgres');

app.post('/api/ratings', async (req, res) => {
  const { stars, categories, comment } = req.body;
  const result = await sql`
    INSERT INTO ratings (stars, categories, comment, created_at)
    VALUES (${stars}, ${JSON.stringify(categories)}, ${comment}, NOW())
    RETURNING id, created_at
  `;
  // ...
});
```

---

## 🛠 Desarrollo local

```bash
npm install
npm run dev
# → http://localhost:3000
```
