const axios = require("axios");
require("dotenv").config();

const JAMENDO_BASE_URL = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// Verificar que el client_id esté configurado
if (!CLIENT_ID || CLIENT_ID === "tu_client_id_aqui") {
  console.warn("⚠️  JAMENDO_CLIENT_ID no configurado. Obtén uno en: https://developer.jamendo.com");
}

/**
 * Buscar canciones en Jamendo
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de canciones
 */
async function searchTracks(query, limit = 20) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/tracks`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
        search: query,
        include: "musicinfo",
        audioformat: "mp32", // MP3 de calidad media (320kbps disponible con mp32)
      },
    });

    return response.data.results.map(formatTrack);
  } catch (error) {
    console.error("Error buscando en Jamendo:", error.message);
    throw error;
  }
}

/**
 * Obtener canciones por género
 * @param {string} genre - Género musical
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de canciones
 */
async function getTracksByGenre(genre, limit = 20) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/tracks`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
        tags: genre,
        include: "musicinfo",
        audioformat: "mp32",
      },
    });

    return response.data.results.map(formatTrack);
  } catch (error) {
    console.error("Error obteniendo canciones por género:", error.message);
    throw error;
  }
}

/**
 * Obtener canciones populares/destacadas
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de canciones
 */
async function getFeaturedTracks(limit = 20) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/tracks`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
        featured: 1,
        include: "musicinfo",
        audioformat: "mp32",
        order: "popularity_total",
      },
    });

    return response.data.results.map(formatTrack);
  } catch (error) {
    console.error("Error obteniendo canciones destacadas:", error.message);
    throw error;
  }
}

/**
 * Obtener información de una canción específica
 * @param {string} trackId - ID de la canción en Jamendo
 * @returns {Promise<Object>} Información de la canción
 */
async function getTrack(trackId) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/tracks`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        id: trackId,
        include: "musicinfo lyrics",
        audioformat: "mp32",
      },
    });

    if (response.data.results.length > 0) {
      return formatTrack(response.data.results[0]);
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo canción:", error.message);
    throw error;
  }
}

/**
 * Buscar artistas
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de artistas
 */
async function searchArtists(query, limit = 10) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/artists`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
        search: query,
      },
    });

    return response.data.results;
  } catch (error) {
    console.error("Error buscando artistas:", error.message);
    throw error;
  }
}

/**
 * Obtener canciones de un artista
 * @param {string} artistId - ID del artista
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de canciones
 */
async function getArtistTracks(artistId, limit = 20) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/tracks`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
        artist_id: artistId,
        include: "musicinfo",
        audioformat: "mp32",
      },
    });

    return response.data.results.map(formatTrack);
  } catch (error) {
    console.error("Error obteniendo canciones del artista:", error.message);
    throw error;
  }
}

/**
 * Obtener playlists/radios disponibles
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de radios
 */
async function getRadios(limit = 10) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/radios`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
      },
    });

    return response.data.results;
  } catch (error) {
    console.error("Error obteniendo radios:", error.message);
    throw error;
  }
}

/**
 * Obtener canciones de una radio
 * @param {string} radioId - ID de la radio
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de canciones
 */
async function getRadioTracks(radioId, limit = 20) {
  try {
    const response = await axios.get(`${JAMENDO_BASE_URL}/tracks`, {
      params: {
        client_id: CLIENT_ID,
        format: "json",
        limit: limit,
        radio_id: radioId,
        include: "musicinfo",
        audioformat: "mp32",
      },
    });

    return response.data.results.map(formatTrack);
  } catch (error) {
    console.error("Error obteniendo canciones de radio:", error.message);
    throw error;
  }
}

/**
 * Formatear track de Jamendo a formato estándar
 * @param {Object} track - Track de Jamendo
 * @returns {Object} Track formateado
 */
function formatTrack(track) {
  return {
    id: track.id,
    jamendo_id: track.id,
    title: track.name,
    artist: track.artist_name,
    artist_id: track.artist_id,
    album: track.album_name,
    album_id: track.album_id,
    duration: track.duration,
    releasedate: track.releasedate,
    image: track.album_image,
    audio_url: track.audio,
    download_url: track.audiodownload,
    share_url: track.shareurl,
    license: track.license_ccurl,
    musicinfo: track.musicinfo || {},
    tags: track.musicinfo?.tags || {},
  };
}

/**
 * Géneros disponibles en Jamendo
 */
const GENRES = [
  "pop",
  "rock",
  "jazz",
  "classical",
  "electronic",
  "hiphop",
  "metal",
  "folk",
  "blues",
  "reggae",
  "ambient",
  "country",
  "funk",
  "soul",
  "punk",
  "indie",
  "world",
  "soundtrack",
  "lounge",
  "relaxation",
];

module.exports = {
  searchTracks,
  getTracksByGenre,
  getFeaturedTracks,
  getTrack,
  searchArtists,
  getArtistTracks,
  getRadios,
  getRadioTracks,
  GENRES,
};