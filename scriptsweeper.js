function initGameState({ width, height, minesCount }) {
    const state = {
        minesCount,
        minesLeft: minesCount,
        isGameOver: false,
        fieldsLeft: width * height,
        fields: Array.from({ length: height }, () => 
         Array(width).fill(0)
        ),
        timerStart: undefined,
        timerInterval: undefined,
        isMuted: false, 
        musicStarted: false,
        isStopped: true,
        minesPlaced: false,
        currentBgMusicId: undefined,
        currentWinMusicId: undefined,
   };

   return state;
}

function insertMines(state, minesCount, firstX, firstY) {
    const width = state.fields[0].length;
    const height = state.fields.length;
    const size = width * height;
    const firstIndex = firstY * width + firstX;

    const indices = new Set();
    while (indices.size < minesCount) {
        const index = Math.floor(Math.random() * size);
        
        if (index !== firstIndex) {
            indices.add(index);
        }
    }
    
    for (const index of indices) {
        const y = Math.floor(index / width);
        const x = index % width;

        state.fields[y][x] = -1;
        updateMineNeighbours(state, x, y);
    }

    state.fieldsLeft -= minesCount;
}

function updateMineNeighbours(state, mineX, mineY) {
    const { fields } = state;
    const height = fields.length;
    const width = fields[0].length;

    const startX = Math.max(0, mineX - 1);
    const startY = Math.max(0, mineY - 1);
    const endX = Math.min(width - 1, mineX + 1);
    const endY = Math.min(height - 1, mineY + 1);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (fields[y][x] !== -1) {
                fields[y][x]++;
            }
        }
    }
}

function createFieldButtons(view, state) {
    const fragment = new DocumentFragment();

    const height = state.fields.length;
    const width = state.fields[0].length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const button = document.createElement('button');

            button.dataset.x = x;
            button.dataset.y = y;

            fragment.append(button);
        }
    }

    view.grid.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    view.grid.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    view.grid.append(fragment);
}

function getButtonPosition(button) {
    return {
        x: Number(button.dataset.x),
        y: Number(button.dataset.y),
    };
}

function initView(view, state) {
    view.smiley.classList.remove('won', 'lost');
    view.minesLeft.innerText = `${state.minesLeft}`.padStart(3, '0');
    view.timer.innerText = '000';

    for (const button of view.grid.children) {
        button.innerText = '';
        button.disabled = false;
        button.removeAttribute('class');
    }
}

function restartGame(view, state) {
    clearInterval(state.timerInterval);
    document.body.classList.remove('lost-bg', 'win-bg');

    const resultBg = document.getElementById('game-result-bg');
    if (resultBg) resultBg.classList.remove('shake');

    if (state.isPlaying && !state.isMuted) {
        manageMusic(state, 'play', 'bg');
    } else {
        manageMusic(state, 'stop');
    }
    state.musicStarted = false;

    const savedMuteState = state.isMuted;
    const savedBgMusicId = state.currentBgMusicId;

    const newState = initGameState({
        width: state.fields[0].length,
        height: state.fields.length,
        minesCount: state.minesCount,
    });

    Object.assign(state, newState);
    state.isMuted = savedMuteState;
    initView(view, state);

    updatePlayerDisplay(state);
}

function ensureTimerStarted(view, state) {
    if (state.timerInterval) {
        return;
    }

    if (!state.musicStarted) {
        const bgTracks = ['music-1', 'music-2', 'music-3', 'music-4', 'music-5', 'music-6', 'music-7'];
        const winTracks = ['win-1', 'win-2', 'win-3', 'win-4', 'win-5'];
        const randomBgIndex = Math.floor(Math.random() * bgTracks.length);
        const randomWinIndex = Math.floor(Math.random() * winTracks.length);
        state.currentBgMusicId = bgTracks[randomBgIndex];
        state.currentWinMusicId = winTracks[randomWinIndex];
        manageMusic(state, 'play', 'bg');
        state.musicStarted = true;
    }

    state.timerStart = new Date();
    state.timerInterval = setInterval(() => {
        const secondsElapsed = Math.floor(
            (new Date() - state.timerStart) / 1000
        );
        view.timer.innerText = `${secondsElapsed}`.padStart(3, '0');
    }, 1000);
}

function handleGameEvents(view, state) {
    
    view.smiley.addEventListener('click', () => {
        playEffect('click');
        restartGame(view, state);
    });

    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('click', () => playEffect('click'));
    }
    
    view.grid.addEventListener('contextmenu', (event) => 
        event.preventDefault()
    );

    view.grid.addEventListener('mousedown', (event) => {
        if (state.isGameOver) {
            return;
        }

        const button = event.target;
        if (button.tagName !== 'BUTTON') {
            return;
        }

        ensureTimerStarted(view, state);
        if (event.button === 2) {
            handleFieldFlag(view, state, button);
        } else {
            handleFieldReveal(view, state, button);
        }
    });
}

function triggerSecretka() {
    if (Math.random() > 0.01) {
        return false;
    }

    const jumpscare = document.getElementById('secretka');
    if (!jumpscare) return false;

    playEffect('gong');
    jumpscare.classList.remove('show-secretka');
    void jumpscare.offsetWidth; 
    jumpscare.classList.add('show-secretka');

    setTimeout(() => {
        jumpscare.classList.remove('show-secretka');
    }, 3000);

    return true;
}

function handleFieldFlag(view, state, button) {
    if (button.disabled) {
        return;
    }

    const isFlagged = button.classList.contains('flagged');
    if (!isFlagged && state.minesLeft <= 0) {
        return;
    }

    playEffect('flag');
    button.classList.toggle('flagged');
    state.minesLeft += isFlagged ? 1 : -1;
    view.minesLeft.innerText = `${state.minesLeft}`.padStart(3, '0');
}

function handleFieldReveal(view, state, button) {
    const secretkaTriggered = triggerSecretka();
    const {x, y} = getButtonPosition(button);

    if (button.classList.contains('flagged')) {
        playEffect('click2');
        return;
    }

    if (!state.minesPlaced) {
        insertMines(state, state.minesCount, x, y);
        state.minesPlaced = true;
    }

    const cellValue = state.fields[y][x];
    
    if (cellValue !== -1 && !secretkaTriggered) {
        playEffect('click2');
    }

    switch(state.fields[y][x]) {
        case -1:
            if (revealField(state, button)) {
                if (!secretkaTriggered) {
                    playEffect('boom');
                }
                document.body.classList.add('lost-bg');
                manageMusic(state, 'stop');

                const windowElement = document.querySelector('.window');
                const resultBg = document.getElementById('game-result-bg');
                const player = document.querySelector('.media-player-window'); 

                if (windowElement) {
                    windowElement.classList.remove('shake');
                    void windowElement.offsetWidth;
                    windowElement.classList.add('shake');
                }

                if (resultBg) {
                    resultBg.classList.remove('shake');
                    void resultBg.offsetWidth;
                    resultBg.classList.add('shake');
                }

                if (player) {
                    player.classList.remove('shake');
                    void player.offsetWidth;
                    player.classList.add('shake');
                }
                
                button.classList.add('exploded');
                view.smiley.classList.remove('won');
                view.smiley.classList.add('lost');
                gameOver(view, state);
            }
            break;
        case 0:
            revelEmptyArea(view.grid, state, x, y);
            break;
        default:
            revealField(state, button);
    }

    if (state.fieldsLeft === 0) {
        view.smiley.classList.remove('lost');
        view.smiley.classList.add('won');
        manageMusic(state, 'play', 'win');
        document.body.classList.add('win-bg');
        gameOver(view, state);
    }
}

function revelEmptyArea(grid, state, x, y) {
    const height = state.fields.length;
    const width = state.fields[0].length;

    const visited = new Set();

    function visit(i, j) {
        if (i < 0 || i >= width || j < 0 || j >= height) {
            return; 
        }

        const index = j * width + i;
        if (visited.has(index)) {
            return;
        }
        visited.add(index);

        revealField(state, grid.children[index]);

        if (state.fields[j][i] !== 0) {
            return;
        }

        visit(i - 1, j);
        visit(i + 1, j);
        visit(i, j - 1);
        visit(i, j + 1);
    }

    visit(x, y);
}

function gameOver(view, state) {
    clearInterval(state.timerInterval);
    state.isGameOver = true;

    const isWin = view.smiley.classList.contains('won');

    if (!isWin) {
        manageMusic(state, 'stop'); 
        
        for (const button of view.grid.children) {
            const { x, y } = getButtonPosition(button);
            if (state.fields[y][x] === -1 && !button.classList.contains('exploded')) {
                button.disabled = true;
                button.classList.remove('flagged');
                button.className = 'mine';
            }
        }
    } else {
        for (const button of view.grid.children) {
            const { x, y } = getButtonPosition(button);
            button.disabled = true;
            if (state.fields[y][x] === -1) {
                button.classList.add('flagged'); 
            }
        }

        updatePlayerDisplay(state);
    }
}

function revealField(state, button) {
    if (button.disabled) {
        return false;
    }

    button.disabled = true;
    button.classList.remove('flagged');

    const { x , y } = getButtonPosition(button);

    const value = state.fields[y][x];

    switch(value) {
        case -1:
            button.className = 'mine';
            break;

        case 0:
            button.className = 'empty';
            state.fieldsLeft--;
            break;

        default:
            button.className = `value-${value}`;
            button.innerText = value;
            state.fieldsLeft--;
    }

    return true;
}

function playEffect(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

function manageMusic(state, action, type = 'bg') {
    const music_1 = document.getElementById('music-1');
    const music_2 = document.getElementById('music-2');
    const music_3 = document.getElementById('music-3');
    const music_4 = document.getElementById('music-4');
    const music_5 = document.getElementById('music-5');
    const music_6 = document.getElementById('music-6');
    const music_7 = document.getElementById('music-7');
    const win_1 = document.getElementById('win-1');
    const win_2 = document.getElementById('win-2');
    const win_3 = document.getElementById('win-3');
    const win_4 = document.getElementById('win-4');
    const win_5 = document.getElementById('win-5');
    
    if (action !== 'stop') {
        const allAudio = [music_1, music_2, music_3, music_4, music_5, music_6, music_7, win_1, win_2, win_3, win_4, win_5];
        allAudio.forEach(audio => {
            if (audio) audio.pause();
        });
    }

    if (action === 'stop') {
        state.isPlaying = false;
        state.isStopped = true;

        const allAudio = [music_1, music_2, music_3, music_4, music_5, music_6, music_7, win_1, win_2, win_3, win_4, win_5];
        allAudio.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });

        updatePlayerDisplay(state);
        return;
    }

    const targetId = type === 'win' ? state.currentWinMusicId : state.currentBgMusicId;
    const current = document.getElementById(targetId);    
    
    if (!state.isMuted && current) {
        state.isStopped = false;

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            current.volume = Number(volumeSlider.value);
        }
        
        current.play()
            .then(() => {
                state.isPlaying = true;
                updatePlayerDisplay(state);
            })
            .catch(() => {
                state.isPlaying = false;
                updatePlayerDisplay(state);
            });
    } else {
        state.isPlaying = false;
        updatePlayerDisplay(state);
    }
}

function updatePlayerDisplay(state) {
    const trackInfo = document.getElementById('player-track-info');
    const btnPlay = document.getElementById('btn-play');
    const muteBtn = document.getElementById('player-mute-btn');

    if (!trackInfo) return;

    const isWinActive = document.body.classList.contains('win-bg');

    let paddedIndex = '01';
    let prefix = 'TRK';

    if (isWinActive) {
        const winTracks = ['win-1', 'win-2', 'win-3', 'win-4', 'win-5'];
        if (!state.currentWinMusicId) state.currentWinMusicId = winTracks[0];
        const winIndex = winTracks.indexOf(state.currentWinMusicId) + 1;
        paddedIndex = String(winIndex).padStart(2, '0');
        prefix = 'WIN';
    } else {
        const bgTracks = ['music-1', 'music-2', 'music-3', 'music-4', 'music-5', 'music-6', 'music-7'];
        if (!state.currentBgMusicId) state.currentBgMusicId = bgTracks[0];
        const trackIndex = bgTracks.indexOf(state.currentBgMusicId) + 1;
        paddedIndex = String(trackIndex).padStart(2, '0');
        prefix = 'TRK';
    }

    if (state.isPlaying && !state.isMuted) {
        trackInfo.innerText = `${prefix}-${paddedIndex} PLAY`;
    } else if (state.isMuted && state.isPlaying) {
        trackInfo.innerText = `${prefix}-${paddedIndex} MUTE`;
    } else if (state.isStopped) {
        trackInfo.innerText = `${prefix}-${paddedIndex} STOP`;
    } else {
        trackInfo.innerText = `${prefix}-${paddedIndex} PAUSE`; 
    }

    if (btnPlay) {
        btnPlay.innerText = (state.isPlaying && !state.isMuted) ? '⏸' : '▶';
        btnPlay.title = (state.isPlaying && !state.isMuted) ? 'Pause' : 'Play';
    }

    if (muteBtn) {
        muteBtn.className = state.isMuted ? 'muted' : 'unmuted';
    }
}

function initMediaPlayer(state) {
    const bgTracks = ['music-1', 'music-2', 'music-3', 'music-4', 'music-5', 'music-6', 'music-7'];
    state.isPlaying = false; 

    const btnPlay = document.getElementById('btn-play');
    const btnStop = document.getElementById('btn-stop');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const muteBtn = document.getElementById('player-mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeContainer = document.getElementById('player-volume-container');

    if (!state.currentBgMusicId) state.currentBgMusicId = bgTracks[0];
    
    setInterval(() => {
        const timeInfo = document.getElementById('player-time-info');
        if (!timeInfo) return;

        let currentAudio = null;
        if (document.body.classList.contains('win-bg') && state.currentWinMusicId) {
            currentAudio = document.getElementById(state.currentWinMusicId);
        } else if (state.currentBgMusicId) {
            currentAudio = document.getElementById(state.currentBgMusicId);
        }

        if (state.isStopped) {
            timeInfo.innerText = '00:00';
        } else if (currentAudio) {
            const mins = String(Math.floor(currentAudio.currentTime / 60)).padStart(2, '0');
            const secs = String(Math.floor(currentAudio.currentTime % 60)).padStart(2, '0');
            timeInfo.innerText = `${mins}:${secs}`;
        } else {
            timeInfo.innerText = '00:00';
        }
    }, 250);

    btnPlay.addEventListener('click', () => {
        playEffect('click');
        if (state.isPlaying) {
            let currentAudio = document.getElementById(state.currentBgMusicId);
            if (document.body.classList.contains('win-bg')) {
                currentAudio = document.getElementById(state.currentWinMusicId);
            }
            if (currentAudio) currentAudio.pause();
            state.isPlaying = false;
            updatePlayerDisplay(state);
        } else {
            state.musicStarted = true;
            const isWin = document.body.classList.contains('win-bg');
            manageMusic(state, 'play', isWin ? 'win' : 'bg');
        }
    });
    
    btnStop.addEventListener('click', () => {
        playEffect('click');
        manageMusic(state, 'stop');
    });

    btnNext.addEventListener('click', () => {
        playEffect('click');
        const isWin = document.body.classList.contains('win-bg');
        
        let currentAudio = document.getElementById(isWin ? state.currentWinMusicId : state.currentBgMusicId);
        if (currentAudio) currentAudio.currentTime = 0;

        if (isWin) {
            const winTracks = ['win-1', 'win-2', 'win-3', 'win-4', 'win-5'];
            let idx = winTracks.indexOf(state.currentWinMusicId);
            idx = (idx + 1) % winTracks.length;
            state.currentWinMusicId = winTracks[idx];
            manageMusic(state, 'play', 'win');
        } else {
            let idx = bgTracks.indexOf(state.currentBgMusicId);
            idx = (idx + 1) % bgTracks.length;
            state.currentBgMusicId = bgTracks[idx];
            manageMusic(state, 'play', 'bg');
        }
    });

    btnPrev.addEventListener('click', () => {
        playEffect('click');
        const isWin = document.body.classList.contains('win-bg');
        
        let currentAudio = document.getElementById(isWin ? state.currentWinMusicId : state.currentBgMusicId);
        if (currentAudio) currentAudio.currentTime = 0;

        if (isWin) {
            const winTracks = ['win-1', 'win-2', 'win-3', 'win-4', 'win-5'];
            let idx = winTracks.indexOf(state.currentWinMusicId);
            idx = (idx - 1 + winTracks.length) % winTracks.length;
            state.currentWinMusicId = winTracks[idx];
            manageMusic(state, 'play', 'win');
        } else {
            let idx = bgTracks.indexOf(state.currentBgMusicId);
            idx = (idx - 1 + bgTracks.length) % bgTracks.length;
            state.currentBgMusicId = bgTracks[idx];
            manageMusic(state, 'play', 'bg');
        }
    });

    muteBtn.addEventListener('click', () => {
        playEffect('click');
        state.isMuted = !state.isMuted;
        
        if (state.isMuted) {
            let currentAudio = document.getElementById(state.currentBgMusicId);
            if (document.body.classList.contains('win-bg')) {
                currentAudio = document.getElementById(state.currentWinMusicId);
            }
            if (currentAudio) currentAudio.pause();
            state.isPlaying = false;
        } else {
            const isWin = document.body.classList.contains('win-bg');
            manageMusic(state, 'play', isWin ? 'win' : 'bg');
        }
        
        updatePlayerDisplay(state);
    });
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (event) => {
            const volume = Number(event.target.value);
            const musicTracks = document.querySelectorAll('audio[id^="music-"], audio[id^="win-"]');
            musicTracks.forEach(audio => {
                audio.volume = volume;
            });

            if (volumeContainer) {
                if (volume === 0) {
                    volumeContainer.classList.replace('unsilent', 'silent');
                } else {
                    volumeContainer.classList.replace('silent', 'unsilent');
                }
            }
        });
    }

    updatePlayerDisplay(state);
}

function initTaskbarClock() {
    const timerElement = document.getElementById('timer-display');
    if (!timerElement) return;

    function updateClock() {
        const now = new Date();
        let hours = String(now.getHours()).padStart(2, '0');
        let minutes = String(now.getMinutes()).padStart(2, '0');
        timerElement.textContent = `${hours}:${minutes}`;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

function initPlayerWindowControls() {
    
    const playerWin = document.getElementById('media-player'); 
    if (!playerWin) return;

    const titleBar = playerWin.querySelector('.title-bar');
    const minimizeBtn = document.getElementById('btn-player-minimize');
    const playerBody = playerWin.querySelector('.window-body');

    
    if (minimizeBtn && playerBody) {
        minimizeBtn.addEventListener('click', () => {
            playerWin.classList.toggle('minimized');
            
            if (playerWin.classList.contains('minimized')) {
                playerBody.style.display = 'none'; 
            } else {
                playerBody.style.display = 'block'; 
            }
        });
    }

    if (!titleBar) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    titleBar.addEventListener('mousedown', (e) => {
        
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = playerWin.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        playerWin.style.position = 'fixed';
        playerWin.style.margin = '0';
        playerWin.style.left = initialLeft + 'px';
        playerWin.style.top = initialTop + 'px';

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        playerWin.style.left = (initialLeft + deltaX) + 'px';
        playerWin.style.top = (initialTop + deltaY) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function initDragAndDrop() {
    const gameWindow = document.querySelector('.window:not(.media-player-window)');
    const playerWindow = document.querySelector('.media-player-window');

    function centerWindowsInitially() {
        if (!gameWindow || !playerWindow) return;

        const gameLeft = (window.innerWidth - gameWindow.offsetWidth) / 2;
        const gameTop = (window.innerHeight - (gameWindow.offsetHeight + playerWindow.offsetHeight + 10)) / 2;

        gameWindow.style.left = gameLeft + 'px';
        gameWindow.style.top = gameTop + 'px';
        playerWindow.style.left = ((window.innerWidth - playerWindow.offsetWidth) / 2) + 'px';
        playerWindow.style.top = (gameTop + gameWindow.offsetHeight + 10) + 'px';
    }

    centerWindowsInitially();
    window.addEventListener('resize', centerWindowsInitially);

    function setupElementDrag(element) {
        if (!element) return;

        const titleBar = element.querySelector('.title-bar') || element;
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        titleBar.style.cursor = 'move';
        
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            if (e.button !== 0) return;

            window.removeEventListener('resize', centerWindowsInitially);

            isDragging = true;
            
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;

            startX = e.clientX;
            startY = e.clientY;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = (initialLeft + dx) + 'px';
            element.style.top = (initialTop + dy) + 'px';
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    setupElementDrag(gameWindow);
    setupElementDrag(playerWindow);
}

function main() {
    const state = initGameState({
        width: 10,
        height: 12,
        minesCount: 12,
    });

    const view = {
        minesLeft: document.getElementById('mines-left'),
        smiley: document.getElementById('smiley'),
        timer: document.getElementById('timer'),
        grid: document.getElementById('grid'),
    }

    createFieldButtons(view, state);
    initView(view, state);
    handleGameEvents(view, state);
    initTaskbarClock();
    initMediaPlayer(state);
    initPlayerWindowControls();
    initDragAndDrop();
    console.log(state);
}

main();