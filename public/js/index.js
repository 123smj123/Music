let songs = [];

// Cargar canciones al iniciar
loadSongs();

async function loadSongs() {
    try {
        const response = await fetch("/songs");
        songs = await response.json();
        renderSongs();
    } catch (error) {
        console.error("Error al cargar canciones:", error);
    }
}

function renderSongs() {
    const songList = document.getElementById("songList");
    const songCount = document.getElementById("songCount");

    songCount.textContent = songs.length;

    if (songs.length === 0) {
        songList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"/>
            </svg>
            <h3>No hay canciones aún</h3>
            <p>Sube tu primera canción para comenzar tu biblioteca</p>
          </div>
        `;
        return;
    }

    songList.innerHTML = songs.map(song => `
        <li class="song-item" id="song-${song.id}">
          <div class="song-header">
            <div class="song-info">
              <h3>${escapeHtml(song.title)}</h3>
              <div class="song-meta">
                🎤 ${escapeHtml(song.artist)}
                ${song.album ? ` • 💿 ${escapeHtml(song.album)}` : ''}
                • 📁 ${formatBytes(song.size)}
              </div>
            </div>
            <div class="song-actions">
              <button class="secondary" onclick="toggleEdit('${song.id}')">✏️ Editar</button>
              <button class="danger" onclick="deleteSong('${song.id}')">🗑️</button>
            </div>
          </div>
          
          <div id="edit-${song.id}" class="edit-form" style="display: none;">
            <input type="text" id="edit-title-${song.id}" value="${escapeHtml(song.title)}" placeholder="Título" />
            <div class="form-row">
              <input type="text" id="edit-artist-${song.id}" value="${escapeHtml(song.artist)}" placeholder="Artista" />
              <input type="text" id="edit-album-${song.id}" value="${escapeHtml(song.album || '')}" placeholder="Álbum" />
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="saveEdit('${song.id}')">💾 Guardar</button>
              <button class="secondary" onclick="toggleEdit('${song.id}')">❌ Cancelar</button>
            </div>
          </div>
          
          <audio controls src="/music/${song.filename}"></audio>
        </li>
      `).join("");
}

function toggleEdit(songId) {
    const editForm = document.getElementById(`edit-${songId}`);
    editForm.style.display = editForm.style.display === 'none' ? 'grid' : 'none';
}

async function saveEdit(songId) {
    const title = document.getElementById(`edit-title-${songId}`).value;
    const artist = document.getElementById(`edit-artist-${songId}`).value;
    const album = document.getElementById(`edit-album-${songId}`).value;

    try {
        const response = await fetch(`/songs/${songId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, artist, album }),
        });

        if (response.ok) {
            await loadSongs();
            toggleEdit(songId);
        } else {
            alert('Error al actualizar la canción');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la canción');
    }
}

async function deleteSong(songId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta canción?')) {
        return;
    }

    try {
        const response = await fetch(`/songs/${songId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            await loadSongs();
        } else {
            alert('Error al eliminar la canción');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la canción');
    }
}

async function syncFiles() {
    if (!confirm('¿Sincronizar archivos de la carpeta uploads con la base de datos?')) {
        return;
    }

    try {
        const response = await fetch('/sync', {
            method: 'POST',
        });

        const result = await response.json();
        alert(result.message);
        await loadSongs();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al sincronizar archivos');
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}