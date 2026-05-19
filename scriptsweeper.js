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

    manageMusic(state, 'stop');
    state.musicStarted = false;
    document.getElementById('mute-button').style.display = 'none';

    const volumeContainer = document.getElementById('volume-container'); 
    if (volumeContainer) volumeContainer.style.display = 'none';

    const newState = initGameState({
        width: state.fields[0].length,
        height: state.fields.length,
        minesCount: state.minesCount,
    });

    Object.assign(state, newState);
    initView(view, state);
}

function ensureTimerStarted(view, state) {
    if (state.timerInterval) {
        return;
    }

    document.getElementById('mute-button').style.display = 'flex';
    const volumeContainer = document.getElementById('volume-container');
    if (volumeContainer) volumeContainer.style.display = 'flex';

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
    document.getElementById('mute-button').addEventListener('click', () => toggleMute(view, state));
    view.smiley.addEventListener('click', () => {
        playEffect('click');
        restartGame(view, state);
    });

    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (event) => {
            const volume = Number(event.target.value);
            const allAudio = document.querySelectorAll('audio');
            allAudio.forEach(audio => {
                audio.volume = volume;
            });

            const volumeContainer = document.getElementById('volume-container');
            if (volumeContainer) {
                if (volume === 0) {
                    volumeContainer.classList.replace('unsilent', 'silent');
                } else {
                    volumeContainer.classList.replace('silent', 'unsilent');
                }
            }
        });
    }
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

                const window = document.querySelector('.window');
                const resultBg = document.getElementById('game-result-bg');

                if (window) {
                    window.classList.remove('shake');
                    void window.offsetWidth;
                    window.classList.add('shake');
                }

                if (resultBg) {
                    resultBg.classList.remove('shake');
                    void resultBg.offsetWidth;
                    resultBg.classList.add('shake');
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
        document.getElementById('mute-button').style.display = 'none';
        const volumeContainer = document.getElementById('volume-container');
        if (volumeContainer) volumeContainer.style.display = 'none';
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
    
    if (music_1) music_1.pause();
    if (music_2) music_2.pause();
    if (music_3) music_3.pause();
    if (music_4) music_4.pause();
    if (music_5) music_5.pause();
    if (music_6) music_6.pause();
    if (music_7) music_7.pause();
    if (win_1) win_1.pause();
    if (win_2) win_2.pause();
    if (win_3) win_3.pause();
    if (win_4) win_4.pause();
    if (win_5) win_5.pause();

    if (action === 'stop') return;

    const current = document.getElementById(type === 'win' ? state.currentWinMusicId : state.currentBgMusicId);    
    const isMuted = document.getElementById('mute-button').classList.contains('muted');
    if (!isMuted && current) {
        current.currentTime = 0;
        current.play().catch(() => {});

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            current.volume = volumeSlider.value;
        }
        
        current.play().catch(() => {});
    }
}

function toggleMute(view, state) {
    const button = document.getElementById('mute-button');
    const text = button.querySelector('.mute-text');
    const isWin = view.smiley.classList.contains('won');
    const volumeContainer = document.querySelector('#volume-container');
    const volumeSlider = document.getElementById('volume-slider');

    state.isMuted = !state.isMuted;
    
    if (state.isMuted) {
        button.classList.replace('unmuted', 'muted');
        text.innerText = 'OFF';

        if (volumeContainer) volumeContainer.style.display = 'none'; 

        manageMusic(state, 'stop');
    } else {
        button.classList.replace('muted', 'unmuted');
        text.innerText = 'ON';

        if (volumeContainer) volumeContainer.style.display = 'flex'; 
        
        if (isWin) {
            manageMusic(state, 'play', 'win');
        } 
        else if (!state.isGameOver && state.musicStarted) {
            manageMusic(state, 'play', 'bg');
        }
    }   
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
    console.log(state);
}

main();