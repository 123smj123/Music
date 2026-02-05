const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(process.cwd() + '/public'));

// Middleware para parsear JSON
app.use(express.json());

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Aceptar solo archivos de audio
    const allowedMimes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de audio"));
    }
  },
});

// Servir archivos estáticos
app.use(express.static("public"));
app.use("/music", express.static("uploads"));

// Inicializar base de datos
async function startServer() {
  try {
    await db.initDB();
    console.log("✅ Conexión a MySQL establecida");

    // Subir música
    app.post("/upload", upload.single("song"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se subió ningún archivo" });
        }

        // Extraer metadatos del formulario o usar valores por defecto
        const songData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
          artist: req.body.artist || "Desconocido",
          album: req.body.album || "",
          size: req.file.size,
        };

        // Guardar en la base de datos
        await db.addSong(songData);

        res.redirect("/");
      } catch (error) {
        console.error("Error al subir archivo:", error);
        
        // Si hay error, eliminar el archivo subido
        if (req.file) {
          const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        
        res.status(500).json({ error: "Error al procesar el archivo" });
      }
    });

    // Listar canciones con metadatos
    app.get("/songs", async (req, res) => {
      try {
        const songs = await db.getAllSongs();
        res.json(songs);
      } catch (error) {
        console.error("Error al listar canciones:", error);
        res.status(500).json({ error: "Error al obtener canciones" });
      }
    });

    // Obtener una canción específica
    app.get("/songs/:id", async (req, res) => {
      try {
        const song = await db.getSongById(req.params.id);
        if (song) {
          res.json(song);
        } else {
          res.status(404).json({ error: "Canción no encontrada" });
        }
      } catch (error) {
        console.error("Error al obtener canción:", error);
        res.status(500).json({ error: "Error al obtener la canción" });
      }
    });

    // Buscar canciones
    app.get("/search", async (req, res) => {
      try {
        const searchTerm = req.query.q || "";
        if (!searchTerm) {
          return res.json([]);
        }
        const songs = await db.searchSongs(searchTerm);
        res.json(songs);
      } catch (error) {
        console.error("Error al buscar canciones:", error);
        res.status(500).json({ error: "Error al buscar canciones" });
      }
    });

    // Obtener estadísticas
    app.get("/stats", async (req, res) => {
      try {
        const stats = await db.getStats();
        res.json(stats);
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
      }
    });

    // Actualizar metadatos de una canción
    app.put("/songs/:id", async (req, res) => {
      try {
        const updates = {
          title: req.body.title,
          artist: req.body.artist,
          album: req.body.album,
        };
        const updatedSong = await db.updateSong(req.params.id, updates);
        if (updatedSong) {
          res.json(updatedSong);
        } else {
          res.status(404).json({ error: "Canción no encontrada" });
        }
      } catch (error) {
        console.error("Error al actualizar canción:", error);
        res.status(500).json({ error: "Error al actualizar la canción" });
      }
    });

    // Eliminar una canción
    app.delete("/songs/:id", async (req, res) => {
      try {
        const song = await db.getSongById(req.params.id);
        if (!song) {
          return res.status(404).json({ error: "Canción no encontrada" });
        }

        // Eliminar el archivo físico
        const filePath = path.join(__dirname, "..", "uploads", song.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Eliminar de la base de datos
        await db.deleteSong(req.params.id);
        res.json({ message: "Canción eliminada exitosamente" });
      } catch (error) {
        console.error("Error al eliminar canción:", error);
        res.status(500).json({ error: "Error al eliminar la canción" });
      }
    });

    // Sincronizar archivos existentes con la base de datos
    app.post("/sync", async (req, res) => {
      try {
        const uploadDir = "uploads/";
        if (!fs.existsSync(uploadDir)) {
          return res.json({ message: "No hay archivos para sincronizar" });
        }

        const files = fs.readdirSync(uploadDir);
        let syncedCount = 0;
        let errorCount = 0;

        for (const file of files) {
          try {
            // Verificar si el archivo ya está en la base de datos
            const existingSong = await db.getSongByFilename(file);
            if (!existingSong) {
              const stats = fs.statSync(path.join(uploadDir, file));
              await db.addSong({
                filename: file,
                originalName: file,
                title: file.replace(/\.[^/.]+$/, ""),
                artist: "Desconocido",
                album: "",
                size: stats.size,
              });
              syncedCount++;
            }
          } catch (error) {
            console.error(`Error al sincronizar ${file}:`, error);
            errorCount++;
          }
        }

        res.json({
          message: `Sincronización completada. ${syncedCount} archivos añadidos, ${errorCount} errores.`,
          synced: syncedCount,
          errors: errorCount,
        });
      } catch (error) {
        console.error("Error al sincronizar:", error);
        res.status(500).json({ error: "Error al sincronizar archivos" });
      }
    });

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🎵 Servidor de música activo en http://localhost:${PORT}`);
      console.log(`📁 Archivos en: ${path.join(__dirname, "..", "uploads")}`);
      console.log(`🗄️  Base de datos: MySQL - ${process.env.DB_NAME || "music_db"}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    console.error("\n💡 Verifica que:");
    console.error("   1. MySQL está ejecutándose");
    console.error("   2. El archivo .env está configurado correctamente");
    console.error("   3. Ejecutaste: npm run setup");
    process.exit(1);
  }
}

startServer();