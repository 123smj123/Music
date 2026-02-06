const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const jamendo = require("./jamendo");
const mm = require("music-metadata");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// SEGURIDAD: Rate limiting
const rateLimit = require('express-rate-limit');

// Rate limiter para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 uploads por ventana
  message: { error: "Demasiadas subidas. Intenta de nuevo en 15 minutos." }
});

// Rate limiter para búsquedas (más permisivo)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // máximo 30 búsquedas por minuto
  message: { error: "Demasiadas búsquedas. Espera un momento." }
});

// Configuración de Multer con LÍMITES DE SEGURIDAD
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitizar nombre de archivo
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
    const uniqueName = Date.now() + "-" + safeName;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
    files: 1 // Solo 1 archivo a la vez
  },
  fileFilter: (req, file, cb) => {
    // SEGURIDAD: Solo permitir tipos de audio específicos
    const allowedMimes = [
      "audio/mpeg", 
      "audio/mp3", 
      "audio/wav", 
      "audio/ogg",
      "audio/webm"
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: MP3, WAV, OGG, WEBM`));
    }
  },
});

// Servir archivos estáticos
app.use(express.static("public"));
app.use("/music", express.static("uploads"));

// Middleware de manejo de errores para Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Solo puedes subir un archivo a la vez.' });
    }
  }
  next(error);
});

// Inicializar base de datos
async function startServer() {
  try {
    await db.initDB();
    console.log("✅ Conexión a MySQL establecida");

    // ==================== ENDPOINTS DE JAMENDO API ====================

    // Buscar canciones en Jamendo
    app.get("/api/jamendo/search", searchLimiter, async (req, res) => {
      try {
        const query = req.query.q || "";
        const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Máximo 50

        if (!query) {
          return res.status(400).json({ error: "Parámetro 'q' requerido" });
        }

        if (query.length < 2) {
          return res.status(400).json({ error: "La búsqueda debe tener al menos 2 caracteres" });
        }

        const tracks = await jamendo.searchTracks(query, limit);
        res.json(tracks);
      } catch (error) {
        console.error("Error en búsqueda Jamendo:", error);
        res.status(500).json({ error: "Error al buscar canciones" });
      }
    });

    // Obtener canciones destacadas
    app.get("/api/jamendo/featured", async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const tracks = await jamendo.getFeaturedTracks(limit);
        res.json(tracks);
      } catch (error) {
        console.error("Error obteniendo destacados:", error);
        res.status(500).json({ error: "Error al obtener canciones destacadas" });
      }
    });

    // Obtener canciones por género
    app.get("/api/jamendo/genre/:genre", async (req, res) => {
      try {
        const genre = req.params.genre;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        
        // Validar que el género esté en la lista permitida
        if (!jamendo.GENRES.includes(genre)) {
          return res.status(400).json({ error: "Género no válido" });
        }
        
        const tracks = await jamendo.getTracksByGenre(genre, limit);
        res.json(tracks);
      } catch (error) {
        console.error("Error obteniendo por género:", error);
        res.status(500).json({ error: "Error al obtener canciones" });
      }
    });

    // Obtener información de una canción específica
    app.get("/api/jamendo/track/:id", async (req, res) => {
      try {
        const track = await jamendo.getTrack(req.params.id);
        if (track) {
          res.json(track);
        } else {
          res.status(404).json({ error: "Canción no encontrada" });
        }
      } catch (error) {
        console.error("Error obteniendo canción:", error);
        res.status(500).json({ error: "Error al obtener canción" });
      }
    });

    // Buscar artistas
    app.get("/api/jamendo/artists", searchLimiter, async (req, res) => {
      try {
        const query = req.query.q || "";
        const limit = Math.min(parseInt(req.query.limit) || 10, 20);

        if (!query) {
          return res.status(400).json({ error: "Parámetro 'q' requerido" });
        }

        const artists = await jamendo.searchArtists(query, limit);
        res.json(artists);
      } catch (error) {
        console.error("Error buscando artistas:", error);
        res.status(500).json({ error: "Error al buscar artistas" });
      }
    });

    // Obtener canciones de un artista
    app.get("/api/jamendo/artist/:id/tracks", async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const tracks = await jamendo.getArtistTracks(req.params.id, limit);
        res.json(tracks);
      } catch (error) {
        console.error("Error obteniendo canciones del artista:", error);
        res.status(500).json({ error: "Error al obtener canciones" });
      }
    });

    // Obtener lista de radios
    app.get("/api/jamendo/radios", async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 20);
        const radios = await jamendo.getRadios(limit);
        res.json(radios);
      } catch (error) {
        console.error("Error obteniendo radios:", error);
        res.status(500).json({ error: "Error al obtener radios" });
      }
    });

    // Obtener canciones de una radio
    app.get("/api/jamendo/radio/:id/tracks", async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const tracks = await jamendo.getRadioTracks(req.params.id, limit);
        res.json(tracks);
      } catch (error) {
        console.error("Error obteniendo canciones de radio:", error);
        res.status(500).json({ error: "Error al obtener canciones" });
      }
    });

    // Obtener géneros disponibles
    app.get("/api/jamendo/genres", (req, res) => {
      res.json(jamendo.GENRES);
    });

    // ==================== ENDPOINTS DE BASE DE DATOS LOCAL ====================

    // Subir música propia con LÍMITES DE SEGURIDAD
    app.post("/upload", uploadLimiter, upload.single("song"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se subió ningún archivo" });
        }

        const filepath = path.join(__dirname, "..", "uploads", req.file.filename);

        // Extraer metadatos automáticamente con music-metadata
        let metadata;
        try {
          metadata = await mm.parseFile(filepath);
        } catch (metadataError) {
          console.warn("No se pudieron extraer metadatos:", metadataError);
          metadata = { common: {}, format: {} };
        }

        const songData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          title: metadata.common.title || req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
          artist: metadata.common.artist || req.body.artist || "Desconocido",
          album: metadata.common.album || req.body.album || "",
          duration: Math.floor(metadata.format.duration || 0),
          size: req.file.size,
        };

        await db.addSong(songData);
        
        // Redirigir o enviar JSON según el tipo de request
        if (req.accepts('html')) {
          res.redirect("/?uploaded=success");
        } else {
          res.json({ success: true, song: songData });
        }
      } catch (error) {
        console.error("Error al subir archivo:", error);

        // Limpiar archivo si hubo error
        if (req.file) {
          const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        res.status(500).json({ error: "Error al procesar el archivo: " + error.message });
      }
    });

    // Listar canciones locales
    app.get("/songs", async (req, res) => {
      try {
        const songs = await db.getAllSongs();
        res.json(songs);
      } catch (error) {
        console.error("Error al listar canciones:", error);
        res.status(500).json({ error: "Error al obtener canciones" });
      }
    });

    // Obtener una canción local específica
    app.get("/songs/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: "ID inválido" });
        }
        
        const song = await db.getSongById(id);
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

    // Actualizar metadatos de una canción local
    app.put("/songs/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: "ID inválido" });
        }
        
        const updates = {
          title: req.body.title,
          artist: req.body.artist,
          album: req.body.album,
        };
        
        const updatedSong = await db.updateSong(id, updates);
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

    // Eliminar una canción local
    app.delete("/songs/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: "ID inválido" });
        }
        
        const song = await db.getSongById(id);
        if (!song) {
          return res.status(404).json({ error: "Canción no encontrada" });
        }

        const filePath = path.join(__dirname, "..", "uploads", song.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        await db.deleteSong(id);
        res.json({ message: "Canción eliminada exitosamente" });
      } catch (error) {
        console.error("Error al eliminar canción:", error);
        res.status(500).json({ error: "Error al eliminar la canción" });
      }
    });

    // Buscar canciones locales
    app.get("/search", searchLimiter, async (req, res) => {
      try {
        const searchTerm = req.query.q || "";
        if (!searchTerm) {
          return res.json([]);
        }
        
        if (searchTerm.length < 2) {
          return res.status(400).json({ error: "La búsqueda debe tener al menos 2 caracteres" });
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

    // Sincronizar archivos existentes
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
            const existingSong = await db.getSongByFilename(file);
            if (!existingSong) {
              const filepath = path.join(uploadDir, file);
              const stats = fs.statSync(filepath);
              
              // Intentar extraer metadatos
              let metadata;
              try {
                metadata = await mm.parseFile(filepath);
              } catch {
                metadata = { common: {}, format: {} };
              }
              
              await db.addSong({
                filename: file,
                originalName: file,
                title: metadata.common.title || file.replace(/\.[^/.]+$/, ""),
                artist: metadata.common.artist || "Desconocido",
                album: metadata.common.album || "",
                duration: Math.floor(metadata.format.duration || 0),
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
      console.log(`📁 Archivos locales: ${path.join(__dirname, "..", "uploads")}`);
      console.log(`🗄️  Base de datos: MySQL - ${process.env.DB_NAME || "music_db"}`);
      console.log(`🌐 API Jamendo: ${process.env.JAMENDO_CLIENT_ID ? "✅ Configurada" : "⚠️  No configurada"}`);
      console.log(`🔒 Seguridad: Rate limiting activado`);
      console.log(`📏 Límite de archivos: 50MB`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    console.error("\n💡 Verifica que:");
    console.error("   1. MySQL está ejecutándose");
    console.error("   2. El archivo .env está configurado correctamente");
    console.error("   3. Ejecutaste: npm run setup");
    console.error("   4. Instalaste: npm install express-rate-limit music-metadata");
    process.exit(1);
  }
}

startServer();