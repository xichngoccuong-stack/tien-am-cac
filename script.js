 const firebaseConfig = {
     apiKey: "AIzaSyCEU_hkazFaQ47eBcWglU0QZr5N4i_XPFk",
     authDomain: "eng-vocab-website.firebaseapp.com",
     projectId: "eng-vocab-website",
     storageBucket: "eng-vocab-website.firebasestorage.app",
     messagingSenderId: "669746577120",
     appId: "1:669746577120:web:494b943ef1319ce4d69a85",
     measurementId: "G-DHBPC5RL89"
 };

 firebase.initializeApp(firebaseConfig);
 const db = firebase.firestore();
 let currentSongList = [];
 let currentIndex = -1;
 let isRepeatMode = false;
 let isAlbumsLoaded = false;
 let currentView = 'albums';
 let isRainPlaying = false;
 let currentAlbumBackground = 'background.mp4';
 let manageSongs = [];

 const cloudName = 'dglxrlydv';
 const uploadPreset = 'vocab_images';

 function showNotification(message) {
     const notif = document.getElementById('notification');
     notif.textContent = message;
     notif.style.display = 'block';
     setTimeout(() => {
         notif.style.display = 'none';
     }, 2000);
 }

 async function playAudio() {
     try {
         await document.getElementById('audio').play();
         document.getElementById('song-name').style.display = 'block';
         document.getElementById('play-btn').style.display = 'none';
     } catch (e) {
         console.error('Autoplay blocked: ' + e.message);
     }
 }

 async function uploadFile() {
     const file = document.getElementById('file-input').files[0];
     const album = document.getElementById('album-select').value;
     if (!file) return;
     if (!album) {
         alert('Please select an album');
         return;
     }
     document.getElementById('overlay').style.display = 'block';
     const formData = new FormData();
     formData.append('file', file);
     formData.append('upload_preset', uploadPreset);
     try {
         const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
             method: 'POST',
             body: formData
         });
         const data = await response.json();
         const url = data.secure_url;
         const name = file.name;
         await db.collection('music').add({ name, url, album });
         document.getElementById('overlay').style.display = 'none';
         showNotification('Upload successful: ' + name);
         loadAlbumList();
     } catch (error) {
         document.getElementById('overlay').style.display = 'none';
         console.error('Upload failed:', error);
         alert('Upload failed');
     }
 }

 async function uploadSongBackgroundVideo(file) {
     document.getElementById('overlay').style.display = 'block';
     const formData = new FormData();
     formData.append('file', file);
     formData.append('upload_preset', uploadPreset);
     try {
         const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
             method: 'POST',
             body: formData
         });
         const data = await response.json();
         document.getElementById('overlay').style.display = 'none';
         return data.secure_url;
     } catch (error) {
         document.getElementById('overlay').style.display = 'none';
         console.error('Upload background video failed:', error);
         alert('Upload background video failed');
         return null;
     }
 }

 async function loadAlbums() {
   try {
     const snapshot = await db.collection('albums').get();
     const select = document.getElementById('album-select');
     select.innerHTML = '<option value="">Select album</option>';
     const docs = [];
     snapshot.forEach(doc => docs.push(doc));
     docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
     docs.forEach(doc => {
       const data = doc.data();
       const option = document.createElement('option');
       option.value = doc.id;
       option.textContent = data.name;
       select.appendChild(option);
     });
   } catch (error) {
     console.error('Load albums failed:', error);
   }
 }
 
 async function loadAlbumList() {
     try {
         const snapshot = await db.collection('albums').get();
         const albumItems = document.getElementById('album-items');
         albumItems.innerHTML = '';
         const docs = [];
         snapshot.forEach(doc => docs.push(doc));
         docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
         docs.forEach(doc => {
             const data = doc.data();
             const p = document.createElement('p');
             p.textContent = '✦ ' + data.name;
             p.style.color = 'white';
             p.style.cursor = 'pointer';
             p.style.fontFamily = "'Shalimar', cursive";
             p.style.fontSize = '24px';
             p.onclick = (event) => { event.stopPropagation(); loadMusicForAlbum(doc.id); };
             albumItems.appendChild(p);
         });
     } catch (error) {
         console.error('Load album list failed:', error);
     }
 }

 async function loadMusicForAlbum(albumId) {
     const header = document.querySelector('.logo-container');
     header.style.display = 'none';
     const bottomLink = document.getElementById('bottom-link');
     bottomLink.style.display = 'none';
     try {
         const albumDoc = await db.collection('albums').doc(albumId).get();
         const albumName = albumDoc.data().name;
         currentAlbumBackground = `vidBackground/${albumName}.mp4`;
         const bgVideo = document.getElementById('background-video');
         bgVideo.onerror = null; // Reset error handler
         bgVideo.src = currentAlbumBackground;
         bgVideo.onerror = () => {
           bgVideo.src = 'background.mp4';
           bgVideo.load();
           bgVideo.play();
         };
         bgVideo.load();
         bgVideo.play();
         const snapshot = await db.collection('music').where('album', '==', albumId).get();
         const audioItems = document.getElementById('audio-items');
         audioItems.innerHTML = '';
         currentSongList = [];
         currentIndex = -1;
         const docs = [];
         snapshot.forEach(doc => docs.push(doc));
         docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
         let index = 0;
         docs.forEach(doc => {
             const data = doc.data();
             data.id = doc.id;
             data.albumName = albumName;
             currentSongList.push(data);
             const p = document.createElement('p');
             p.textContent = data.name.replace('.mp3', '');
             p.style.color = 'white';
             p.style.cursor = 'pointer';
             p.style.fontFamily = "'Shalimar', cursive";
             p.style.fontSize = '24px';
             p.dataset.index = index;
             if (albumName === 'Nhạc Trung') {
                 p.style.fontFamily = "'Ma Shan Zheng', sans-serif";
             }
             p.onclick = async () => {
                 const songName = data.name;
                 currentIndex = currentSongList.findIndex(song => song.name === songName);
                 await setBackground(data);
                 document.getElementById('audio').src = data.url;
                 document.getElementById('audio').load();
                 document.getElementById('audio').play().then(() => {
                     const playPauseBtn = document.getElementById('play-pause-btn');
                     if (playPauseBtn) {
                         playPauseBtn.textContent = '❚❚';
                     }
                 });
                 document.getElementById('song-name').style.display = 'block';
                 document.getElementById('song-name').textContent = data.name.replace('.mp3', '');
                 document.title = data.name.replace('.mp3', '');
                 if (data.name.includes('黄昏-周传雄') || data.albumName === 'Nhạc Trung') {
                     document.getElementById('song-name').style.fontFamily = "'Ma Shan Zheng', sans-serif";
                 } else {
                     document.getElementById('song-name').style.fontFamily = "'Shalimar', cursive";
                 }
                 document.getElementById('controls').style.display = 'block';
                 const allP = document.querySelectorAll('#audio-items p');
                 allP.forEach(p => p.classList.remove('playing'));
                 p.classList.add('playing');
                 updateAlbumLabel();
                 loadSongNote();
             };
             audioItems.appendChild(p);
             index++;
         });
         document.getElementById('album-items').style.display = 'none';
         document.getElementById('audio-list').style.display = 'block';
         currentView = 'music';
         if (currentSongList.length > 0) {
             currentIndex = 0;
             document.getElementById('controls').style.display = 'block';
             document.getElementById('song-name').style.display = 'block';
             await playCurrentSong();
         }
     } catch (error) {
         console.error('Load music for album failed:', error);
     }
 }

 async function createAlbum() {
     const name = document.getElementById('new-album-name').value.trim();
     if (!name) {
         alert('Please enter the album name');
         return;
     }
     document.getElementById('overlay').style.display = 'block';
     try {
         await db.collection('albums').add({ name, background: '' });
         showNotification('Album created: ' + name);
         loadAlbums();
         if (isAlbumsLoaded) loadAlbumList();
         document.getElementById('new-album-name').value = '';
     } catch (error) {
         console.error('Create album failed:', error);
         alert('Create album failed');
     } finally {
         document.getElementById('overlay').style.display = 'none';
     }
 }

 async function toggleAlbums() {
     const albumItems = document.getElementById('album-items');
     const audioList = document.getElementById('audio-list');
     if (currentView === 'music') {
         audioList.style.display = 'none';
         if (isAlbumsLoaded) {
             albumItems.style.display = 'block';
         } else {
             await loadAlbumList();
             isAlbumsLoaded = true;
             albumItems.style.display = 'block';
         }
         currentView = 'albums';
     } else {
         if (!isAlbumsLoaded) {
             await loadAlbumList();
             isAlbumsLoaded = true;
         }
         albumItems.style.display = albumItems.style.display === 'none' ? 'block' : 'none';
     }
 }

 function playRainLoop() {
     const rainAudio = document.getElementById('rain-audio');
     const rainVideo = document.getElementById('rain-video');
     const button = document.getElementById('rain-button');
     const icon = button.querySelector('i');
     if (!isRainPlaying) {
         rainAudio.src = 'rain.mp3';
         rainAudio.play();
         rainVideo.play();
         rainVideo.style.display = 'block';
         isRainPlaying = true;
         if (icon) {
             icon.style.color = 'green';
             icon.style.fontWeight = 'bolder';
         }
     } else {
         rainAudio.pause();
         rainVideo.pause();
         rainVideo.style.display = 'none';
         isRainPlaying = false;
         if (icon) {
             icon.style.color = '';
             icon.style.fontWeight = '';
         }
     }
 }

 async function toggleUploadForm() {
   const modal = document.getElementById('upload-modal');
   if (modal.style.display === 'none') {
     await loadAlbums();
   }
   modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
 }

 function toggleFunctionMenu() {
   const menu = document.getElementById('function-menu');
   menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
 }

 async function toggleManageModal() {
   const modal = document.getElementById('manage-modal');
   modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
   if (modal.style.display === 'block') {
     await loadSongsForManage();
     await loadAlbumsForManage();
     if (currentIndex >= 0 && currentSongList.length > 0) {
       const currentSong = currentSongList[currentIndex];
       document.getElementById('song-input').value = currentSong.name.replace('.mp3', '');
       await loadNoteForSelectedSong();
     }
   }
 }

 async function loadSongsForManage() {
   try {
     const snapshot = await db.collection('music').get();
     const input = document.getElementById('song-input');
     const datalist = document.getElementById('song-list');
     datalist.innerHTML = '';
     manageSongs = [];
     const docs = [];
     snapshot.forEach(doc => docs.push(doc));
     docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
     docs.forEach(doc => {
       const data = doc.data();
       manageSongs.push({ id: doc.id, name: data.name });
       const option = document.createElement('option');
       option.value = data.name.replace('.mp3', '');
       datalist.appendChild(option);
     });
     document.getElementById('song-input').addEventListener('input', loadNoteForSelectedSong);
   } catch (error) {
     console.error('Load songs for manage failed:', error);
   }
 }

 async function loadNoteForSelectedSong() {
   const songNameInput = document.getElementById('song-input').value.trim();
   const songNoteInput = document.getElementById('song-note-input');
   if (!songNameInput) {
     songNoteInput.value = '';
     return;
   }
   const song = manageSongs.find(s => s.name.replace('.mp3', '') === songNameInput);
   if (!song) {
     songNoteInput.value = '';
     return;
   }
   try {
     const doc = await db.collection('music').doc(song.id).get();
     const note = doc.data().note || '';
     songNoteInput.value = note;
     const noteColor = doc.data().noteColor || '#ffffff';
     document.getElementById('note-color-input').value = noteColor;
     const selectedSquare = document.querySelector(`.color-square[data-color="${noteColor}"]`);
     if (selectedSquare) {
       document.querySelectorAll('.color-square').forEach(el => el.classList.remove('selected'));
       selectedSquare.classList.add('selected');
     }
     const noteBold = doc.data().noteBold || false;
     document.getElementById('note-bold-input').checked = noteBold;
   } catch (error) {
     console.error('Load note for song failed:', error);
     songNoteInput.value = '';
     document.getElementById('note-color-input').value = '#ffffff';
   }
 }

 async function loadAlbumsForManage() {
   try {
     const snapshot = await db.collection('albums').get();
     const select = document.getElementById('album-move-select');
     select.innerHTML = '<option value="">Select an album to move to (optional)</option>';
     const docs = [];
     snapshot.forEach(doc => docs.push(doc));
     docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
     docs.forEach(doc => {
       const data = doc.data();
       const option = document.createElement('option');
       option.value = doc.id;
       option.textContent = data.name;
       select.appendChild(option);
     });
   } catch (error) {
     console.error('Load albums for manage failed:', error);
   }
 }

 async function saveSongChanges() {
   const songNameInput = document.getElementById('song-input').value;
   if (!songNameInput) {
     alert('Please select a track');
     return;
   }
   const song = manageSongs.find(s => s.name.replace('.mp3', '') === songNameInput);
   if (!song) {
     alert('Track not found');
     return;
   }
   const songId = song.id;
   const newName = document.getElementById('new-song-name').value.trim();
   const newAlbum = document.getElementById('album-move-select').value;
   const newNote = document.getElementById('song-note-input').value;
   const newNoteColor = document.getElementById('note-color-input').value;
   const newNoteBold = document.getElementById('note-bold-input').checked;
   const replaceFile = document.getElementById('song-replace-file-input').files[0];
   const updateData = {};
   if (newName) {
     updateData.name = newName + '.mp3';
   }
   if (newAlbum) {
     updateData.album = newAlbum;
   }
   updateData.note = newNote;
   updateData.noteColor = newNoteColor;
   updateData.noteBold = newNoteBold;
   if (replaceFile) {
     document.getElementById('overlay').style.display = 'block';
     const formData = new FormData();
     formData.append('file', replaceFile);
     formData.append('upload_preset', uploadPreset);
     try {
       const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
         method: 'POST',
         body: formData
       });
       const data = await response.json();
       const newUrl = data.secure_url;
       updateData.url = newUrl;
       document.getElementById('overlay').style.display = 'none';
     } catch (error) {
       document.getElementById('overlay').style.display = 'none';
       console.error('Upload replace file failed:', error);
       alert('Upload replace file failed');
       return;
     }
   }
   if (Object.keys(updateData).length === 0 && !replaceFile) {
     alert('No changes');
     return;
   }
   try {
     await db.collection('music').doc(songId).update(updateData);
     showNotification('Update successful');
     document.getElementById('song-replace-file-input').value = '';
     toggleManageModal();
     if (isAlbumsLoaded) loadAlbumList();
     if (newAlbum) {
       loadAlbums();
     }
   } catch (error) {
     console.error('Update song failed:', error);
     alert('Update failed');
   }
 }

 async function deleteSong() {
     const songNameInput = document.getElementById('song-input').value;
     if (!songNameInput) {
       alert('Please select a track to delete');
       return;
     }
     const song = manageSongs.find(s => s.name.replace('.mp3', '') === songNameInput);
     if (!song) {
       alert('Track not found');
       return;
     }
     const songId = song.id;
   const confirmDelete = confirm('Are you sure you want to delete this track?');
   if (!confirmDelete) {
     return;
   }
   try {
     await db.collection('music').doc(songId).delete();
     showNotification('Delete track successful');
     toggleManageModal();
     if (isAlbumsLoaded) loadAlbumList();
   } catch (error) {
     console.error('Delete track failed:', error);
     alert('Delete track failed');
   }
 }

 window.playAudio = playAudio;
 window.uploadFile = uploadFile;
 window.toggleUploadForm = toggleUploadForm;
 window.toggleFunctionMenu = toggleFunctionMenu;
 window.createAlbum = createAlbum;
 window.toggleManageModal = toggleManageModal;
 window.loadSongsForManage = loadSongsForManage;
 window.loadAlbumsForManage = loadAlbumsForManage;
 window.saveSongChanges = saveSongChanges;
 window.deleteSong = deleteSong;
 window.toggleAlbums = toggleAlbums;
 window.playRainLoop = playRainLoop;

 function selectColor(element) {
     const color = element.getAttribute('data-color');
     document.querySelectorAll('.color-square').forEach(el => el.classList.remove('selected'));
     element.classList.add('selected');
     document.getElementById('note-color-input').value = color;
 }

 window.selectColor = selectColor;

 async function setBackground(data) {
   const bgVideo = document.getElementById('background-video');
   if (bgVideo) {
     // Reset error handler
     bgVideo.onerror = null;

     // Load album video first
     /*bgVideo.src = currentAlbumBackground;
     bgVideo.onerror = () => {
       // If album video fails, use default
       bgVideo.src = 'background.mp4';
       bgVideo.load();
       bgVideo.play();
     };
     bgVideo.load();
     bgVideo.play();*/

     // Check if song video exists and switch if it does
     const songName = data.name.replace('.mp3', '');
     const songVidPath = `vidBackground/${songName}.mp4`;
     bgVideo.src = songVidPath;
     bgVideo.onerror = () => {
       if (data.backgroundVideo) {
         bgVideo.src = data.backgroundVideo;
       } else {
         bgVideo.src = currentAlbumBackground;
       }
     };
     bgVideo.load();
      bgVideo.play();
   }
 }

 async function loadSongNote() {
   const songNoteElement = document.getElementById('song-note');
   if (currentIndex >= 0 && currentSongList.length > 0) {
     const currentSong = currentSongList[currentIndex];
     if (currentSong && currentSong.id) {
       try {
         const doc = await db.collection('music').doc(currentSong.id).get();
         const note = doc.data().note;
         if (note && note.trim()) {
           songNoteElement.textContent = note;
           songNoteElement.style.color = doc.data().noteColor || '#ffffff';
           songNoteElement.style.fontWeight = doc.data().noteBold ? 'bold' : 'normal';
           songNoteElement.style.display = 'block';
         } else {
           songNoteElement.style.display = 'none';
         }
       } catch (error) {
         console.error('Load song note failed:', error);
         songNoteElement.style.display = 'none';
       }
     } else {
       songNoteElement.style.display = 'none';
     }
   } else {
     songNoteElement.style.display = 'none';
   }
 }

 function updateAlbumLabel() {
   const label = document.getElementById('current-album-label');
   const albumItems = document.getElementById('album-items');
   const audio = document.getElementById('audio');
   if (currentIndex >= 0 && currentSongList.length > 0 && albumItems.style.display === 'none' && audio && !audio.paused) {
     const currentSong = currentSongList[currentIndex];
     if (currentSong && currentSong.albumName) {
       label.textContent = `: ${currentSong.albumName}`;
       label.style.display = 'inline';
     } else {
       label.textContent = '';
       label.style.display = 'none';
     }
   } else {
     label.textContent = '';
     label.style.display = 'none';
   }
 }

 async function playCurrentSong() {
   const data = currentSongList[currentIndex];
   await setBackground(data);
   const audio = document.getElementById('audio');
   if (audio) {
     audio.src = data.url;
     const songNameElement = document.getElementById('song-name');
     if (songNameElement) {
       songNameElement.style.display = 'block';
       songNameElement.textContent = data.name.replace('.mp3', '');
       document.title = data.name.replace('.mp3', '');
       if (data.name.includes('黄昏-周传雄') || data.albumName === 'Nhạc Trung') {
         songNameElement.style.fontFamily = "'Ma Shan Zheng', sans-serif";
       } else {
         songNameElement.style.fontFamily = "'Shalimar', cursive";
       }
     }
     const playBtn = document.getElementById('play-btn');
     if (playBtn) {
       playBtn.style.display = 'none';
     }
     const controls = document.getElementById('controls');
     if (controls) {
       controls.style.display = 'block';
     }
     const allP = document.querySelectorAll('#audio-items p');
     allP.forEach(p => p.classList.remove('playing'));
     audio.play().then(() => {
       const playPauseBtn = document.getElementById('play-pause-btn');
       if (playPauseBtn) {
         playPauseBtn.textContent = '❚❚';
       }
       const currentP = document.querySelector(`#audio-items p[data-index="${currentIndex}"]`);
       if (currentP) {
           currentP.classList.add('playing');
           currentP.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
       }
       updateAlbumLabel();
       loadSongNote();
     }).catch((e) => {
       console.error('Autoplay blocked: ' + e.message);
       const playPauseBtn = document.getElementById('play-pause-btn');
       if (playPauseBtn) {
         playPauseBtn.textContent = '▶';
       }
     });
   }
 }
 
 function formatTime(seconds) {
   const min = Math.floor(seconds / 60);
   const sec = Math.floor(seconds % 60);
   return `${min}:${sec.toString().padStart(2, '0')}`;
 }

 async function playSongFromManage() {
   const songName = document.getElementById('song-input').value.trim();
   if (!songName) return;
   try {
     const snapshot = await db.collection('music').where('name', '>=', songName + '.mp3').where('name', '<=', songName + '.mp3\uf8ff').get();
     if (!snapshot.empty) {
       const doc = snapshot.docs[0];
       const data = doc.data();
       data.id = doc.id;
       const albumDoc = await db.collection('albums').doc(data.album).get();
       const albumName = albumDoc.data().name;
       data.albumName = albumName;
       data.backgroundVideo = albumDoc.data().background || 'background.mp4';
       await loadMusicForAlbum(data.album);
       currentIndex = currentSongList.findIndex(song => song.name === data.name);
       await setBackground(data);
       document.getElementById('audio').src = data.url;
       document.getElementById('audio').load();
       document.getElementById('audio').play().then(() => {
         const playPauseBtn = document.getElementById('play-pause-btn');
         if (playPauseBtn) {
           playPauseBtn.textContent = '❚❚';
         }
       }).catch((e) => {
         console.error('Autoplay blocked: ' + e.message);
       });
       document.getElementById('song-name').style.display = 'block';
       document.getElementById('song-name').textContent = data.name.replace('.mp3', '');
       document.title = data.name.replace('.mp3', '');
       if (data.name.includes('黄昏-周传雄') || data.albumName === 'Nhạc Trung') {
         document.getElementById('song-name').style.fontFamily = "'Ma Shan Zheng', sans-serif";
       } else {
         document.getElementById('song-name').style.fontFamily = "'Shalimar', cursive";
       }
       document.getElementById('controls').style.display = 'block';
       const allP = document.querySelectorAll('#audio-items p');
       allP.forEach(p => p.classList.remove('playing'));
       const currentP = document.querySelector(`#audio-items p[data-index="${currentIndex}"]`);
       if (currentP) currentP.classList.add('playing');
       toggleManageModal();
       updateAlbumLabel();
       loadSongNote();
     } else {
       showNotification('Song not found');
     }
   } catch (error) {
     console.error('Play song from manage failed:', error);
     showNotification('Error playing song');
   }
 }

 window.onload = async function() {
   const overlay = document.getElementById('overlay');
   overlay.style.display = 'block';
   await loadAlbums();
   if (!isAlbumsLoaded) {
     await loadAlbumList();
     isAlbumsLoaded = true;
   }
   await document.fonts.load('1em "VNI-Thuphap"');
   overlay.style.display = 'none';
   const header = document.querySelector('.logo-container');
   header.style.display = 'flex';
   const bottomLink = document.getElementById('bottom-link');
   bottomLink.style.display = 'block';
   document.getElementById('prev-btn').onclick = async () => {
     if (currentIndex > 0) {
       currentIndex--;
     } else {
       currentIndex = currentSongList.length - 1;
     }
     await playCurrentSong();
   };
   document.getElementById('next-btn').onclick = async () => {
     if (currentIndex < currentSongList.length - 1) {
       currentIndex++;
     } else {
       currentIndex = 0;
     }
     await playCurrentSong();
   };
   document.getElementById('play-pause-btn').onclick = () => {
     const audio = document.getElementById('audio');
     if (audio.paused) {
       audio.play();
       document.getElementById('play-pause-btn').textContent = '❚❚';
     } else {
       audio.pause();
       document.getElementById('play-pause-btn').textContent = '▶';
     }
   };
   document.getElementById('repeat-btn').onclick = () => {
     isRepeatMode = !isRepeatMode;
     const icon = document.querySelector('#repeat-btn i');
     if (isRepeatMode) {
       icon.className = 'bi bi-repeat-1';
       icon.style.color = 'green';
       icon.style.fontWeight = 'bold';
     } else {
       icon.className = 'fa-solid fa-repeat';
       icon.style.color = '';
       icon.style.fontWeight = '';
     }
   };
   document.getElementById('seek-bar').oninput = (e) => {
     const audio = document.getElementById('audio');
     const seekTo = (e.target.value / 100) * audio.duration;
     audio.currentTime = seekTo;
   };
   document.getElementById('audio').ontimeupdate = () => {
     const audio = document.getElementById('audio');
     const seekBar = document.getElementById('seek-bar');
     const currentTimeSpan = document.getElementById('current-time');
     const durationSpan = document.getElementById('duration');
     if (audio.duration) {
       seekBar.value = (audio.currentTime / audio.duration) * 100;
       currentTimeSpan.textContent = formatTime(audio.currentTime);
       durationSpan.textContent = formatTime(audio.duration);
       const percentage = (audio.currentTime / audio.duration) * 100;
       seekBar.style.background = `linear-gradient(to right, rgba(255, 0, 0, 0.8) 0%, rgba(255, 0, 0, 0.8) ${percentage}%, rgba(255, 255, 255, 0.5) ${percentage}%, rgba(255, 255, 255, 0.5) 100%)`;
     }
   };
   document.getElementById('audio').onended = async () => {
     if (isRepeatMode) {
       const audio = document.getElementById('audio');
       audio.currentTime = 0;
       audio.play();
     } else {
       if (currentIndex < currentSongList.length - 1) {
         currentIndex++;
       } else {
         currentIndex = 0;
       }
       await playCurrentSong();
     }
   };
   document.getElementById('audio').onpause = () => {
     updateAlbumLabel();
   };
   document.getElementById('audio').onplay = () => {
     updateAlbumLabel();
   };
 };

 window.playSongFromManage = playSongFromManage;

 async function downloadCurrentSong() {
   if (currentIndex >= 0 && currentSongList.length > 0) {
     const song = currentSongList[currentIndex];
     document.getElementById('overlay').style.display = 'block';
     try {
       const response = await fetch(song.url);
       const blob = await response.blob();
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = song.name;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
       showNotification('Download successful: ' + song.name.replace('.mp3', ''));
     } catch (error) {
       console.error('Download failed:', error);
       showNotification('Download failed');
     } finally {
       document.getElementById('overlay').style.display = 'none';
     }
   }
 }

 window.downloadCurrentSong = downloadCurrentSong;