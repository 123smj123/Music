const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "music-db.json");

// Inicializar la base de datos si no existe
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ songs: [] }, null, 2));
  }
}

// Leer la base de datos
function readDB() {
  initDB();
  const data = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data);
}

// Escribir en la base de datos
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Agregar una canción
function addSong(songData) {
  const db = readDB();
  const newSong = {
    id: Date.now().toString(),
    filename: songData.filename,
    originalName: songData.originalName,
    title: songData.title || songData.originalName,
    artist: songData.artist || "Desconocido",
    album: songData.album || "",
    duration: songData.duration || null,
    uploadDate: new Date().toISOString(),
    size: songData.size || 0,
  };
  db.songs.push(newSong);
  writeDB(db);
  return newSong;
}

// Obtener todas las canciones
function getAllSongs() {
  const db = readDB();
  return db.songs;
}

// Obtener una canción por ID
function getSongById(id) {
  const db = readDB();
  return db.songs.find((song) => song.id === id);
}

// Obtener una canción por filename
function getSongByFilename(filename) {
  const db = readDB();
  return db.songs.find((song) => song.filename === filename);
}

// Eliminar una canción
function deleteSong(id) {
  const db = readDB();
  db.songs = db.songs.filter((song) => song.id !== id);
  writeDB(db);
  return true;
}

// Actualizar metadatos de una canción
function updateSong(id, updates) {
  const db = readDB();
  const songIndex = db.songs.findIndex((song) => song.id === id);
  if (songIndex !== -1) {
    db.songs[songIndex] = { ...db.songs[songIndex], ...updates };
    writeDB(db);
    return db.songs[songIndex];
  }
  return null;
}

module.exports = {
  initDB,
  addSong,
  getAllSongs,
  getSongById,
  getSongByFilename,
  deleteSong,
  updateSong,
};