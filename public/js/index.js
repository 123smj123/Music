let currentTab = 'explore';
const genres = [];

// Cargar al iniciar
window.addEventListener('DOMContentLoaded', () => {
    loadGenres();
    loadFeatured();
    loadLocalSongs();
});

// Cambiar de pestaña
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');

    if (tab === 'local') {
        loadLocalSongs();
    }
}

// Cargar géneros
async function loadGenres() {
    try {
        const response = await fetch('/api/jamendo/genres');
        const genreList = await response.json();

        const container = document.getElementById('genres');
        container.innerHTML = genreList.map(genre =>
            `<button class="genre-pill" onclick="loadByGenre('${genre}')">${genre}</button>`
        ).join('');
    } catch (error) {
        console.error('Error cargando géneros:', error);
    }
}

// Cargar canciones destacadas
async function loadFeatured() {
    showLoading();
    try {
        const response = await fetch('/api/jamendo/featured?limit=20');
        const tracks = await response.json();
        displayJamendoResults(tracks, 'Canciones Destacadas');
    } catch (error) {
        console.error('Error cargando destacados:', error);
        hideLoading();
    }
}

// Buscar en Jamendo
async function searchJamendo() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    showLoading();
    try {
        const response = await fetch(`/api/jamendo/search?q=${encodeURIComponent(query)}&limit=20`);
        const tracks = await response.json();
        displayJamendoResults(tracks, `Resultados para "${query}"`);
    } catch (error) {
        console.error('Error en búsqueda:', error);
        hideLoading();
    }
}

// Cargar por género
async function loadByGenre(genre) {
    showLoading();
    document.getElementById('resultsTitle').textContent = `Género: ${genre}`;
    try {
        const response = await fetch(`/api/jamendo/genre/${genre}?limit=20`);
        const tracks = await response.json();
        displayJamendoResults(tracks, `Género: ${genre}`);
    } catch (error) {
        console.error('Error cargando género:', error);
        hideLoading();
    }
}

// Mostrar resultados de Jamendo
function displayJamendoResults(tracks, title) {
    hideLoading();
    const container = document.getElementById('jamendoResults');
    document.getElementById('resultsTitle').textContent = title;

    if (tracks.length === 0) {
        container.innerHTML = '<div class="empty-state">No se encontraron resultados</div>';
        return;
    }

    container.innerHTML = tracks.map(track => `
        <div class="song-card" onclick='playTrack(${JSON.stringify(track)})'>
          <img class="song-image" src="${track.image || ''}" alt="${escapeHtml(track.title)}" 
               onerror="this.style.background='linear-gradient(135deg, #667eea, #764ba2)'; this.src=''" />
          <div class="song-title">${escapeHtml(track.title)}</div>
          <div class="song-artist">🎤 ${escapeHtml(track.artist)}</div>
          <div class="song-info">
            <span>${formatDuration(track.duration)}</span>
            <button class="play-button" onclick='event.stopPropagation(); playTrack(${JSON.stringify(track)})'>▶</button>
          </div>
        </div>
      `).join('');
}

// Reproducir canción
function playTrack(track) {
    const player = document.getElementById('audioPlayer');
    const playerBar = document.getElementById('playerBar');

    player.src = track.audio_url;
    player.play();

    document.getElementById('playerTitle').textContent = track.title;
    document.getElementById('playerArtist').textContent = track.artist;
    document.getElementById('playerImage').src = track.image || '';

    playerBar.classList.add('active');
}

// Cerrar reproductor
function closePlayer() {
    const player = document.getElementById('audioPlayer');
    const playerBar = document.getElementById('playerBar');
    player.pause();
    player.src = '';
    playerBar.classList.remove('active');
}

// Cargar canciones locales
async function loadLocalSongs() {
    try {
        const response = await fetch('/songs');
        const songs = await response.json();

        document.getElementById('songCount').textContent = songs.length;
        const container = document.getElementById('localSongs');

        if (songs.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No hay canciones locales</h3><p>Sube tu primera canción para comenzar</p></div>';
            return;
        }

        container.innerHTML = songs.map(song => `
          <div class="song-card">
            <div class="song-image"></div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">🎤 ${escapeHtml(song.artist)}</div>
            <div class="song-info">
              <span>${formatBytes(song.size)}</span>
              <button class="play-button" onclick='playLocalTrack("${song.filename}", "${escapeHtml(song.title)}", "${escapeHtml(song.artist)}")'>▶</button>
            </div>
          </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando canciones locales:', error);
    }
}

// Reproducir canción local
function playLocalTrack(filename, title, artist) {
    const player = document.getElementById('audioPlayer');
    const playerBar = document.getElementById('playerBar');

    player.src = `/music/${filename}`;
    player.play();

    document.getElementById('playerTitle').textContent = title;
    document.getElementById('playerArtist').textContent = artist;
    document.getElementById('playerImage').src = '';

    playerBar.classList.add('active');
}

// Utilidades
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('jamendoResults').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('jamendoResults').style.display = 'grid';
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Buscar con Enter
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchJamendo();
});