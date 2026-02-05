-- Script SQL para crear la base de datos manualmente en HeidiSQL
-- Puedes ejecutar este script directamente en HeidiSQL

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS music_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE music_db;

-- Crear la tabla de canciones
CREATE TABLE IF NOT EXISTS songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) DEFAULT 'Desconocido',
  album VARCHAR(255) DEFAULT '',
  duration INT DEFAULT NULL COMMENT 'Duración en segundos',
  size BIGINT DEFAULT 0 COMMENT 'Tamaño en bytes',
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_title (title),
  INDEX idx_artist (artist),
  INDEX idx_album (album)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Consultas útiles para gestionar desde HeidiSQL:

-- Ver todas las canciones
-- SELECT * FROM songs ORDER BY upload_date DESC;

-- Buscar canciones por artista
-- SELECT * FROM songs WHERE artist LIKE '%nombre_artista%';

-- Buscar canciones por título
-- SELECT * FROM songs WHERE title LIKE '%nombre_cancion%';

-- Obtener estadísticas
-- SELECT 
--   COUNT(*) as total_canciones,
--   COUNT(DISTINCT artist) as total_artistas,
--   COUNT(DISTINCT album) as total_albums,
--   SUM(size) as tamaño_total_bytes,
--   ROUND(SUM(size) / 1024 / 1024, 2) as tamaño_total_mb
-- FROM songs;

-- Canciones por artista
-- SELECT artist, COUNT(*) as cantidad 
-- FROM songs 
-- GROUP BY artist 
-- ORDER BY cantidad DESC;

-- Actualizar metadatos de una canción específica
-- UPDATE songs 
-- SET title = 'Nuevo Título', artist = 'Nuevo Artista', album = 'Nuevo Álbum'
-- WHERE id = 1;

-- Eliminar una canción (solo de la BD, no el archivo)
-- DELETE FROM songs WHERE id = 1;