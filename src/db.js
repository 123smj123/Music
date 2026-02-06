const mysql = require("mysql2/promise");
require("dotenv").config();

// Configuración de la conexión
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "music_db",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Pool de conexiones
let pool;

// Inicializar el pool de conexiones
function initPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log("✅ Pool de conexiones MySQL creado");
  }
  return pool;
}

// Obtener una conexión del pool
async function getConnection() {
  if (!pool) {
    initPool();
  }
  return await pool.getConnection();
}

// Crear la base de datos y las tablas
async function initDB() {
  let connection;
  try {
    // Conectar sin especificar la base de datos
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    connection = await mysql.createConnection(tempConfig);

    // Crear la base de datos si no existe
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Base de datos '${dbConfig.database}' verificada/creada`);

    await connection.query(`USE ${dbConfig.database}`);

    // Crear tabla de canciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        original_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) DEFAULT 'Desconocido',
        album VARCHAR(255) DEFAULT '',
        duration INT DEFAULT NULL,
        size BIGINT DEFAULT 0,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_title (title),
        INDEX idx_artist (artist),
        INDEX idx_album (album)
      )ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

     // Crear tabla de playlists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

     // Crear tabla de relación entre playlists y canciones
    await connection.query(`  
      CREATE TABLE IF NOT EXISTS playlist_songs (
        playlist_id INT,
        song_id INT,
        position INT,
        PRIMARY KEY (playlist_id, song_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id),
        FOREIGN KEY (song_id) REFERENCES songs(id)
      );
    `);

    console.log("✅ Tabla 'songs' verificada/creada");

    await connection.end();

    // Inicializar el pool después de crear la estructura
    initPool();
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error.message);
    if (connection) await connection.end();
    throw error;
  }
}

// Agregar una canción
async function addSong(songData) {
  const connection = await getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO songs (filename, original_name, title, artist, album, size) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        songData.filename,
        songData.originalName,
        songData.title || songData.originalName,
        songData.artist || "Desconocido",
        songData.album || "",
        songData.size || 0,
      ]
    );

    const [rows] = await connection.query(
      "SELECT * FROM songs WHERE id = ?",
      [result.insertId]
    );

    return rows[0];
  } catch (error) {
    console.error("Error al agregar canción:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Obtener todas las canciones
async function getAllSongs() {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      "SELECT * FROM songs ORDER BY upload_date DESC"
    );
    return rows;
  } catch (error) {
    console.error("Error al obtener canciones:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Obtener una canción por ID
async function getSongById(id) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query("SELECT * FROM songs WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error al obtener canción:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Obtener una canción por filename
async function getSongByFilename(filename) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      "SELECT * FROM songs WHERE filename = ?",
      [filename]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error al obtener canción por filename:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Actualizar metadatos de una canción
async function updateSong(id, updates) {
  const connection = await getConnection();
  try {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push("title = ?");
      values.push(updates.title);
    }
    if (updates.artist !== undefined) {
      fields.push("artist = ?");
      values.push(updates.artist);
    }
    if (updates.album !== undefined) {
      fields.push("album = ?");
      values.push(updates.album);
    }
    if (updates.duration !== undefined) {
      fields.push("duration = ?");
      values.push(updates.duration);
    }

    if (fields.length === 0) {
      return await getSongById(id);
    }

    values.push(id);

    await connection.query(
      `UPDATE songs SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return await getSongById(id);
  } catch (error) {
    console.error("Error al actualizar canción:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Eliminar una canción
async function deleteSong(id) {
  const connection = await getConnection();
  try {
    const [result] = await connection.query("DELETE FROM songs WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error al eliminar canción:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Buscar canciones
async function searchSongs(searchTerm) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT * FROM songs 
       WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
       ORDER BY upload_date DESC`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    return rows;
  } catch (error) {
    console.error("Error al buscar canciones:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Obtener estadísticas
async function getStats() {
  const connection = await getConnection();
  try {
    const [countResult] = await connection.query(
      "SELECT COUNT(*) as total FROM songs"
    );
    const [sizeResult] = await connection.query(
      "SELECT SUM(size) as totalSize FROM songs"
    );
    const [artistsResult] = await connection.query(
      "SELECT COUNT(DISTINCT artist) as totalArtists FROM songs"
    );

    return {
      totalSongs: countResult[0].total,
      totalSize: sizeResult[0].totalSize || 0,
      totalArtists: artistsResult[0].totalArtists,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Cerrar el pool de conexiones
async function closePool() {
  if (pool) {
    await pool.end();
    console.log("Pool de conexiones cerrado");
  }
}

// Manejar cierre de la aplicación
process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});

module.exports = {
  initDB,
  addSong,
  getAllSongs,
  getSongById,
  getSongByFilename,
  updateSong,
  deleteSong,
  searchSongs,
  getStats,
  closePool,
};