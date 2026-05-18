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
    view.smiley.removeAttribute('class');
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
    document.body.classList.remove('lost-bg');
    document.body.classList.remove('win-bg');
    manageMusic('stop');
    state.musicStarted = false;
    document.getElementById('mute-button').style.display = 'none';

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
    if (!state.musicStarted) {
        manageMusic('play', 'bg');
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
                manageMusic('stop');
                const window = document.querySelector('.window');
                window.classList.remove('shake');
                void window.offsetWidth;
                window.classList.add('shake');
                button.classList.add('exploded');
                view.smiley.className = 'lost';
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
        view.smiley.className = 'won';
        manageMusic('play', 'win');
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
        manageMusic('stop');
    }

    for (const button of view.grid.children) {
        const { x, y } = getButtonPosition(button);

        if (state.fields[y][x] === -1) {
            revealField(state, button);
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
        audio.play();
    }
}

function manageMusic(action, type = 'bg') {
    const mainMusic = document.getElementById('main-music');
    const winMusic = document.getElementById('win-music');
    
    mainMusic.pause();
    winMusic.pause();

    if (action === 'stop') return;

    const current = (type === 'win') ? winMusic : mainMusic;
    const isMuted = document.getElementById('mute-button').classList.contains('muted');
    if (!isMuted) {
        current.currentTime = 0;
        current.play().catch(() => {});
    }
}

function toggleMute(view, state) {
    const button = document.getElementById('mute-button');
    const text = button.querySelector('.mute-text');
    const isWin = view.smiley.classList.contains('won');
    
    state.isMuted = !state.isMuted;

if (state.isMuted) {
        button.classList.replace('unmuted', 'muted');
        text.innerText = 'OFF';
        manageMusic('stop');
    } else {
        button.classList.replace('muted', 'unmuted');
        text.innerText = 'ON';
        
        if (isWin) {
            manageMusic('play', 'win');
        } 
        else if (!state.isGameOver && state.musicStarted) {
            manageMusic('play', 'bg');
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
