let currentTab = 'explore';
let playQueue = [];
let currentIndex = 0;
let currentSongs = []; // Para ordenamiento

// Cargar al iniciar
window.addEventListener('DOMContentLoaded', () => {
    loadGenres();
    loadFeatured();
    loadLocalSongs();
    setupDragAndDrop();
    setupAudioPlayer();
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
        currentSongs = tracks;
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
        currentSongs = tracks;
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
        currentSongs = tracks;
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

    container.innerHTML = tracks.map((track, index) => `
        <div class="song-card" onclick='addToQueueAndPlay(${JSON.stringify(track)}, ${index})'>
          <img class="song-image" src="${track.image || ''}" alt="${escapeHtml(track.title)}" 
               onerror="this.style.background='linear-gradient(135deg, #667eea, #764ba2)'; this.src=''" />
          <div class="song-title">${escapeHtml(track.title)}</div>
          <div class="song-artist">🎤 ${escapeHtml(track.artist)}</div>
          <div class="song-info">
            <span>${formatDuration(track.duration)}</span>
            <button class="play-button" onclick='event.stopPropagation(); addToQueueAndPlay(${JSON.stringify(track)}, ${index})'>▶</button>
          </div>
        </div>
      `).join('');
}

// Sistema de cola de reproducción
function addToQueueAndPlay(track, index) {
    // Crear cola con todas las canciones actuales desde el índice clickeado
    playQueue = currentSongs.slice(index);
    currentIndex = 0;
    playCurrentTrack();
}

function playCurrentTrack() {
    if (playQueue.length === 0 || currentIndex >= playQueue.length) return;
    
    const track = playQueue[currentIndex];
    const player = document.getElementById('audioPlayer');
    const playerBar = document.getElementById('playerBar');

    player.src = track.audio_url;
    player.play();

    document.getElementById('playerTitle').textContent = track.title;
    document.getElementById('playerArtist').textContent = track.artist;
    document.getElementById('playerImage').src = track.image || '';

    playerBar.classList.add('active');
}

function playNext() {
    if (currentIndex < playQueue.length - 1) {
        currentIndex++;
        playCurrentTrack();
    }
}

function playPrevious() {
    if (currentIndex > 0) {
        currentIndex--;
        playCurrentTrack();
    }
}

// Configurar reproductor de audio
function setupAudioPlayer() {
    const player = document.getElementById('audioPlayer');
    
    // Auto-play siguiente canción al terminar
    player.addEventListener('ended', playNext);
    
    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
        }
        if (e.code === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            playNext();
        }
        if (e.code === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            playPrevious();
        }
    });
}

// Reproducir canción (compatibilidad)
function playTrack(track) {
    addToQueueAndPlay(track, 0);
}

// Cerrar reproductor
function closePlayer() {
    const player = document.getElementById('audioPlayer');
    const playerBar = document.getElementById('playerBar');
    player.pause();
    player.src = '';
    playerBar.classList.remove('active');
    playQueue = [];
    currentIndex = 0;
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

// Buscar canciones locales
async function searchLocal() {
    const query = document.getElementById('localSearchInput')?.value;
    if (!query) {
        loadLocalSongs();
        return;
    }

    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const songs = await response.json();
        
        const container = document.getElementById('localSongs');
        
        if (songs.length === 0) {
            container.innerHTML = '<div class="empty-state">No se encontraron resultados</div>';
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
        console.error('Error buscando canciones locales:', error);
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

// Ordenar canciones
function sortSongs(criteria) {
    if (!currentSongs || currentSongs.length === 0) return;

    let sorted = [...currentSongs];
    
    switch(criteria) {
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'artist':
            sorted.sort((a, b) => a.artist.localeCompare(b.artist));
            break;
        case 'duration':
            sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
            break;
        case 'date':
        default:
            // Ya están ordenadas por defecto
            break;
    }
    
    currentSongs = sorted;
    displayJamendoResults(sorted, document.getElementById('resultsTitle').textContent);
}

// Drag & Drop para subir archivos
function setupDragAndDrop() {
    const uploadForm = document.querySelector('form[action="/upload"]');
    if (!uploadForm) return;

    const fileInput = uploadForm.querySelector('input[type="file"]');
    const dropZone = uploadForm;

    // Prevenir comportamiento por defecto
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Efectos visuales
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    // Manejar drop
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            fileInput.files = files;
            // Auto-submit el formulario
            uploadForm.submit();
        }
    }
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
    if (!seconds) return '0:00';
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
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Buscar con Enter
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchJamendo();
    });
    
    document.getElementById('localSearchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocal();
    });
});