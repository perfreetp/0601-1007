// ============ 应用状态 ============
let appState = {
    currentPage: 'training',
    currentLevel: null,
    selectedTheme: 'music',
    selectedDifficulty: 'easy',
    canvasElements: [],
    selectedElement: null,
    timerInterval: null,
    timeRemaining: 600,
    isPlaying: false,
    replaySteps: [],
    currentStep: 0,
    dragData: null,
    lastScores: null,
    lastWorkId: null,
    galleryFilter: 'all',
    currentViewingWorkId: null
};

// ============ 页面导航 ============
function goToPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const page = document.getElementById('page-' + pageName);
    const navBtn = document.querySelector(`.nav-btn[data-page="${pageName}"]`);
    
    if (page) page.classList.add('active');
    if (navBtn) navBtn.classList.add('active');
    
    appState.currentPage = pageName;
    
    if (pageName === 'review') {
        setTimeout(() => {
            drawGrowthChart();
            drawRadarChart();
        }, 100);
    }
    if (pageName === 'gallery') {
        renderGallery();
    }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => goToPage(btn.dataset.page));
});

// ============ Toast 提示 ============
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ============ 初始化 ============
function init() {
    document.getElementById('userExp').textContent = GameData.user.exp;
    document.getElementById('userCoins').textContent = GameData.user.coins;
    updateTaskRequirements();
    syncFontUI();
    renderGallery();
    bindGalleryFilters();
    bindCommentEnter();
}

function bindCommentEnter() {
    const input = document.getElementById('commentInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitComment();
        });
    }
}

// ============ 通用画布渲染函数 ============
function parseGradient(style) {
    const patterns = [
        { key: '#f093fb', colors: ['#f093fb', '#f5576c'] },
        { key: '#4facfe', colors: ['#4facfe', '#00f2fe'] },
        { key: '#43e97b', colors: ['#43e97b', '#38f9d7'] },
        { key: '#fa709a', colors: ['#fa709a', '#fee140'] },
        { key: '#30cfd0', colors: ['#30cfd0', '#330867'] },
        { key: '#667eea', colors: ['#667eea', '#764ba2'] },
        { key: '#FF6B6B', colors: ['#F7FFF7', '#FFE66D'] },
        { key: '#2C3E50', colors: ['#ECF0F1', '#BDC3C7'] },
        { key: '#2D5016', colors: ['#FFFACD', '#9ACD32'] },
        { key: '#FF4500', colors: ['#FFFFE0', '#FFD700'] }
    ];
    for (const p of patterns) {
        if (style && style.includes(p.key)) return p.colors;
    }
    return ['#f8fafc', '#e2e8f0'];
}

function renderDesignToCanvas(ctx, W, H, bgStyle, elements, scale) {
    scale = scale || 2;
    ctx.clearRect(0, 0, W, H);

    const bg = bgStyle || 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
    if (bg.startsWith('#') || bg.startsWith('rgb')) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        const colors = parseGradient(bg);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
    }

    if (!elements) return;

    elements.forEach(el => {
        const x = el.x * scale;
        const y = el.y * scale;

        if (el.type === 'text') {
            const fontSize = (el.fontSize || 16) * scale;
            const fontWeight = el.fontWeight || '400';
            ctx.fillStyle = el.color || '#1e293b';
            const fontFamily = getFontCSS(el.fontFamily || 'Noto Sans SC');
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            ctx.textBaseline = 'top';

            const text = el.content || '';
            const chars = text.split('');
            let line = '';
            let lineY = y;
            const maxWidth = 300 * scale;

            chars.forEach(char => {
                const testLine = line + char;
                if (ctx.measureText(testLine).width > maxWidth && line) {
                    ctx.fillText(line, x, lineY);
                    line = char;
                    lineY += fontSize * 1.4;
                } else {
                    line = testLine;
                }
            });
            if (line) ctx.fillText(line, x, lineY);

        } else if (el.type === 'shape') {
            ctx.fillStyle = el.bgColor || '#667eea';
            const size = 100 * scale;
            if (el.content === 'rect') {
                ctx.fillRect(x, y, size, size);
            } else if (el.content === 'circle') {
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (el.content === 'line') {
                ctx.fillRect(x, y + 20*scale, 150*scale, 4*scale);
            }
        } else if (el.type === 'image') {
            const imgW = 150 * scale;
            const imgH = 150 * scale;
            const imgGradient = ctx.createLinearGradient(x, y, x + imgW, y + imgH);
            const imgColors = parseGradient(el.bgColor || '#667eea');
            imgGradient.addColorStop(0, imgColors[0]);
            imgGradient.addColorStop(1, imgColors[1]);
            ctx.fillStyle = imgGradient;
            ctx.fillRect(x, y, imgW, imgH);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, imgW, imgH);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = `${36 * scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🖼️', x + imgW/2, y + imgH/2);
            ctx.textAlign = 'start';
        }
    });
}

function getDesignThumbnail(work, thumbW, thumbH) {
    const bgStyle = work.background || GameData.gradients[work.gradientIdx || 0];
    const cvs = document.createElement('canvas');
    cvs.width = thumbW;
    cvs.height = thumbH;
    const ctx = cvs.getContext('2d');
    const scale = Math.min(thumbW / 400, thumbH / 560);
    renderDesignToCanvas(ctx, thumbW, thumbH, bgStyle, work.canvasElements, scale);
    return cvs.toDataURL();
}

// ============ 训练营功能 ============
function startCourse(courseId) {
    const course = GameData.courses[courseId];
    if (!course) return;
    showToast(`开始学习: ${course.name}`, 'success');
}

function toggleTask(el) {
    const taskItem = el.closest('.task-item');
    const isCompleted = taskItem.classList.contains('completed');
    
    if (isCompleted) {
        taskItem.classList.remove('completed');
        el.querySelector('.task-icon').textContent = '';
        taskItem.querySelector('.task-status').textContent = '进行中';
        taskItem.querySelector('.task-status').classList.remove('completed');
    } else {
        taskItem.classList.add('completed');
        el.querySelector('.task-icon').textContent = '✓';
        taskItem.querySelector('.task-status').textContent = '已完成';
        taskItem.querySelector('.task-status').classList.add('completed');
        showToast('任务完成！+50 经验值', 'success');
    }
}

// ============ 关卡选择 ============
document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        appState.selectedTheme = card.dataset.theme;
    });
});

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        appState.selectedDifficulty = btn.dataset.diff;
    });
});

function startLevel(levelId) {
    const level = GameData.levels.find(l => l.id === levelId);
    if (!level) return;
    
    appState.currentLevel = level;
    appState.canvasElements = [];
    appState.selectedElement = null;
    
    document.getElementById('editorLevelTitle').textContent = `关卡 ${level.id}: ${level.title}`;
    
    const timeMap = { easy: 600, normal: 900, hard: 1200 };
    appState.timeRemaining = timeMap[appState.selectedDifficulty] || 600;
    
    goToPage('editor');
    resetCanvas();
    startTimer();
}

function goBack() {
    stopTimer();
    goToPage('levels');
}

// ============ 计时器 ============
function startTimer() {
    stopTimer();
    updateTimerDisplay();
    appState.timerInterval = setInterval(() => {
        appState.timeRemaining--;
        updateTimerDisplay();
        if (appState.timeRemaining <= 0) {
            stopTimer();
            showToast('时间到！', 'error');
            submitDesign();
        }
    }, 1000);
}

function stopTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const min = Math.floor(appState.timeRemaining / 60);
    const sec = appState.timeRemaining % 60;
    document.getElementById('timerDisplay').textContent = 
        `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ============ 拖拽功能 ============
document.querySelectorAll('.element-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        appState.dragData = {
            type: item.dataset.type,
            content: item.dataset.content
        };
        e.dataTransfer.effectAllowed = 'copy';
    });
});

const canvas = document.getElementById('designCanvas');
const canvasElements = document.getElementById('canvasElements');

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!appState.dragData) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 50;
    const y = e.clientY - rect.top - 20;
    
    addElementToCanvas(appState.dragData, x, y);
    appState.dragData = null;
    updateTaskRequirements();
});

function addElementToCanvas(data, x, y) {
    const element = {
        id: Date.now(),
        type: data.type,
        content: data.content,
        x: Math.max(0, x),
        y: Math.max(0, y),
        fontSize: data.type === 'text' ? (data.content === '主标题' ? 32 : data.content === '副标题' ? 20 : 14) : 16,
        color: '#1e293b',
        fontFamily: 'Noto Sans SC',
        fontWeight: data.content === '主标题' ? '700' : '400',
        width: 150,
        height: 'auto',
        bgColor: null
    };
    
    appState.canvasElements.push(element);
    renderCanvasElement(element);
    selectElement(element.id);
    
    appState.replaySteps.push({
        type: 'add',
        element: { ...element },
        time: Date.now()
    });
}

function renderCanvasElement(element) {
    const el = document.createElement('div');
    el.className = 'canvas-element';
    el.dataset.id = element.id;
    el.style.left = element.x + 'px';
    el.style.top = element.y + 'px';
    
    if (element.type === 'text') {
        el.textContent = element.content;
        el.style.fontSize = element.fontSize + 'px';
        el.style.color = element.color;
        el.style.fontFamily = getFontCSS(element.fontFamily);
        el.style.fontWeight = element.fontWeight;
    } else if (element.type === 'image') {
        const img = document.createElement('img');
        img.src = element.content;
        img.style.width = '150px';
        img.onerror = function() {
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width:150px;height:150px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:40px;';
            placeholder.textContent = '🖼️';
            el.appendChild(placeholder);
        };
        el.appendChild(img);
    } else if (element.type === 'shape') {
        const shape = document.createElement('div');
        shape.className = 'shape-' + element.content;
        if (element.bgColor) {
            shape.style.background = element.bgColor;
        }
        el.appendChild(shape);
    }
    
    makeDraggable(el, element);
    
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectElement(element.id);
    });
    
    canvasElements.appendChild(el);
}

function makeDraggable(domEl, elementData) {
    let isDragging = false;
    let startX, startY, startElX, startElY;
    
    domEl.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startElX = elementData.x;
        startElY = elementData.y;
        domEl.style.zIndex = 1000;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        elementData.x = Math.max(0, Math.min(350, startElX + dx));
        elementData.y = Math.max(0, Math.min(520, startElY + dy));
        domEl.style.left = elementData.x + 'px';
        domEl.style.top = elementData.y + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            domEl.style.zIndex = '';
        }
    });
}

function selectElement(id) {
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
    });
    
    const domEl = document.querySelector(`.canvas-element[data-id="${id}"]`);
    const element = appState.canvasElements.find(e => e.id === id);
    
    if (domEl && element) {
        domEl.classList.add('selected');
        appState.selectedElement = element;
        renderPropertyPanel(element);
    }
}

canvas.addEventListener('click', (e) => {
    if (e.target === canvas || e.target.id === 'canvasBg' || e.target.id === 'canvasElements') {
        document.querySelectorAll('.canvas-element').forEach(el => {
            el.classList.remove('selected');
        });
        appState.selectedElement = null;
        renderPropertyPanel(null);
    }
});

function renderPropertyPanel(element) {
    const panel = document.getElementById('propertyPanel');
    
    if (!element) {
        panel.innerHTML = '<p class="empty-hint">选择元素查看属性</p>';
        return;
    }
    
    let html = '';
    
    if (element.type === 'text') {
        html += `
            <div class="prop-group">
                <label>文字内容</label>
                <input type="text" value="${element.content}" onchange="updateElementProp('content', this.value)">
            </div>
            <div class="prop-group">
                <label>字号</label>
                <input type="range" min="12" max="72" value="${element.fontSize}" 
                       oninput="updateElementProp('fontSize', parseInt(this.value)); this.nextElementSibling.textContent = this.value + 'px'">
                <span>${element.fontSize}px</span>
            </div>
            <div class="prop-group">
                <label>文字颜色</label>
                <input type="color" value="${element.color}" onchange="updateElementProp('color', this.value)">
            </div>
            <div class="prop-group">
                <label>字重</label>
                <select onchange="updateElementProp('fontWeight', this.value)">
                    <option value="300" ${element.fontWeight === '300' ? 'selected' : ''}>细体</option>
                    <option value="400" ${element.fontWeight === '400' ? 'selected' : ''}>常规</option>
                    <option value="500" ${element.fontWeight === '500' ? 'selected' : ''}>中等</option>
                    <option value="700" ${element.fontWeight === '700' ? 'selected' : ''}>粗体</option>
                    <option value="900" ${element.fontWeight === '900' ? 'selected' : ''}>特粗</option>
                </select>
            </div>
        `;
    } else if (element.type === 'shape') {
        html += `
            <div class="prop-group">
                <label>背景颜色</label>
                <input type="color" value="${element.bgColor || '#667eea'}" onchange="updateElementProp('bgColor', this.value)">
            </div>
        `;
    }
    
    html += `
        <div class="prop-group">
            <label>位置 X</label>
            <input type="number" value="${Math.round(element.x)}" onchange="updateElementProp('x', parseFloat(this.value))">
        </div>
        <div class="prop-group">
            <label>位置 Y</label>
            <input type="number" value="${Math.round(element.y)}" onchange="updateElementProp('y', parseFloat(this.value))">
        </div>
        <button class="btn-secondary" style="width:100%;margin-top:12px;background:#fee;color:#c00;border-color:#fcc;" 
                onclick="deleteSelectedElement()">删除元素</button>
    `;
    
    panel.innerHTML = html;
}

function getFontCSS(fontKey) {
    const font = GameData.fonts[fontKey];
    return font ? font.cssFamily : "'Noto Sans SC', sans-serif";
}

function updateElementProp(prop, value) {
    if (!appState.selectedElement) return;
    
    const element = appState.selectedElement;
    if (prop === 'x' || prop === 'y' || prop === 'fontSize') {
        value = parseFloat(value);
    }
    element[prop] = value;
    
    const domEl = document.querySelector(`.canvas-element[data-id="${element.id}"]`);
    if (domEl) {
        if (prop === 'x') domEl.style.left = value + 'px';
        if (prop === 'y') domEl.style.top = value + 'px';
        if (prop === 'fontSize') domEl.style.fontSize = value + 'px';
        if (prop === 'color') domEl.style.color = value;
        if (prop === 'fontWeight') domEl.style.fontWeight = value;
        if (prop === 'fontFamily') domEl.style.fontFamily = getFontCSS(value);
        if (prop === 'content') domEl.textContent = value;
        if (prop === 'bgColor') {
            const shape = domEl.querySelector('[class^="shape-"]');
            if (shape) shape.style.background = value;
        }
    }
    
    if (prop === 'fontSize') {
        renderPropertyPanel(element);
    }
}

function deleteSelectedElement() {
    if (!appState.selectedElement) return;
    
    const id = appState.selectedElement.id;
    appState.canvasElements = appState.canvasElements.filter(e => e.id !== id);
    
    const domEl = document.querySelector(`.canvas-element[data-id="${id}"]`);
    if (domEl) domEl.remove();
    
    appState.selectedElement = null;
    renderPropertyPanel(null);
    updateTaskRequirements();
    showToast('元素已删除');
}

function resetCanvas() {
    canvasElements.innerHTML = '';
    appState.canvasElements = [];
    appState.selectedElement = null;
    renderPropertyPanel(null);
    document.getElementById('canvasBg').style.background = '';
    updateTaskRequirements();
}

// ============ 配色方案 ============
function applyPalette(name) {
    const palette = GameData.palettes[name];
    if (!palette) return;
    
    const bg = document.getElementById('canvasBg');
    bg.style.background = `linear-gradient(135deg, ${palette[4]}, ${palette[3]})`;
    
    appState.canvasElements.forEach((el, i) => {
        if (el.type === 'text') {
            el.color = palette[i % 4];
            const domEl = document.querySelector(`.canvas-element[data-id="${el.id}"]`);
            if (domEl) domEl.style.color = el.color;
        } else if (el.type === 'shape') {
            el.bgColor = palette[i % 4];
            const domEl = document.querySelector(`.canvas-element[data-id="${el.id}"] [class^="shape-"]`);
            if (domEl) domEl.style.background = el.bgColor;
        }
    });
    
    showToast(`已应用配色: ${name}`, 'success');
    updateTaskRequirements();
}

function applyCustomColor(color) {
    const bg = document.getElementById('canvasBg');
    bg.style.background = color;
    showToast('背景色已更新');
}

// ============ 字体功能 ============
function selectFont(fontName) {
    const font = GameData.fonts[fontName];
    if (!font) return;
    
    if (!GameData.user.unlockedFonts.includes(fontName)) {
        showToast('该字体尚未解锁，请先在素材仓库解锁', 'error');
        return;
    }
    
    if (!appState.selectedElement || appState.selectedElement.type !== 'text') {
        showToast('请先选择文字元素', 'error');
        return;
    }
    
    updateElementProp('fontFamily', fontName);
    if (font.fontWeight) {
        updateElementProp('fontWeight', font.fontWeight.toString());
    }
    
    showToast(`字体已切换为: ${font.name}`);
}

function syncFontUI() {
    const unlocked = GameData.user.unlockedFonts;
    const idSuffixMap = {
        'Noto Sans SC': 'noto',
        'SimSun': 'songti',
        'KaiTi': 'kaiti',
        'bold': 'bold'
    };
    
    Object.keys(GameData.fonts).forEach(fontKey => {
        const font = GameData.fonts[fontKey];
        const suffix = idSuffixMap[fontKey] || fontKey.toLowerCase().replace(/\s+/g, '');
        const cardId = 'font-card-' + suffix;
        const editorId = 'font-editor-' + suffix;
        
        const card = document.getElementById(cardId);
        const editorFont = document.getElementById(editorId);
        
        if (unlocked.includes(fontKey)) {
            if (card && !card.classList.contains('unlocked')) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
                const info = card.querySelector('.font-info');
                if (info) {
                    const oldStatus = info.querySelector('.font-status');
                    const unlockBtn = info.querySelector('.btn-unlock');
                    if (oldStatus) {
                        oldStatus.className = 'font-status unlocked-icon';
                        oldStatus.textContent = '✓ 已解锁';
                    }
                    if (unlockBtn) unlockBtn.remove();
                }
            }
            if (editorFont && editorFont.classList.contains('locked')) {
                editorFont.classList.remove('locked');
                const lockIcon = editorFont.querySelector('.lock-icon');
                if (lockIcon) lockIcon.remove();
            }
        }
    });
}

// ============ 任务要求检查 ============
function updateTaskRequirements() {
    const hasTitle = appState.canvasElements.some(e => e.type === 'text' && (e.content.includes('标题') || e.fontSize >= 28));
    const hasImage = appState.canvasElements.some(e => e.type === 'image');
    const hasColor = document.getElementById('canvasBg').style.background !== '';
    const hasEnoughSpace = appState.canvasElements.length <= 8;
    
    const reqs = document.querySelectorAll('.req-item');
    const checks = [hasTitle, hasImage, hasColor, hasEnoughSpace];
    
    reqs.forEach((req, i) => {
        const check = req.querySelector('.req-check');
        if (checks[i]) {
            req.classList.add('completed');
            check.textContent = '✓';
        } else {
            req.classList.remove('completed');
            check.textContent = '';
        }
    });
}

// ============ 提交评分 ============
function submitDesign() {
    stopTimer();
    
    if (appState.canvasElements.length === 0) {
        showToast('请先添加一些设计元素！', 'error');
        return;
    }
    
    const scores = calculateScores();
    appState.lastScores = scores;
    
    setTimeout(() => {
        document.getElementById('finalScore').textContent = scores.total;
        
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (scores.total / 100) * circumference;
        document.getElementById('scoreProgress').style.strokeDashoffset = offset;
        
        const scoreBars = document.querySelectorAll('.score-bar-fill');
        const scoreValues = [scores.layout, scores.color, scores.readability, scores.whitespace, scores.creativity];
        
        scoreBars.forEach((bar, i) => {
            bar.style.width = scoreValues[i] + '%';
            const valueEl = bar.closest('.score-item').querySelector('.score-item-value');
            if (valueEl) valueEl.textContent = scoreValues[i] + '/100';
        });
        
        goToPage('scoring');
        showToast('评分完成！', 'success');
    }, 500);
}

function calculateScores() {
    const elements = appState.canvasElements;
    
    const layoutScore = elements.length >= 3 ? 80 + Math.floor(Math.random() * 20) : 50 + Math.floor(Math.random() * 20);
    const hasBg = document.getElementById('canvasBg').style.background !== '';
    const colorScore = hasBg ? 75 + Math.floor(Math.random() * 25) : 40 + Math.floor(Math.random() * 20);
    const readabilityScore = elements.some(e => e.type === 'text') ? 80 + Math.floor(Math.random() * 20) : 50;
    const whitespaceScore = elements.length <= 6 ? 70 + Math.floor(Math.random() * 30) : 40 + Math.floor(Math.random() * 20);
    const creativityScore = elements.length >= 4 ? 75 + Math.floor(Math.random() * 25) : 60 + Math.floor(Math.random() * 20);
    
    const total = Math.round((layoutScore + colorScore + readabilityScore + whitespaceScore + creativityScore) / 5);
    
    return { total, layout: layoutScore, color: colorScore, readability: readabilityScore, whitespace: whitespaceScore, creativity: creativityScore };
}

function nextLevel() {
    const nextId = (appState.currentLevel?.id || 1) + 1;
    if (nextId <= 3) {
        startLevel(nextId);
    } else {
        showToast('恭喜完成所有关卡！', 'success');
        goToPage('levels');
    }
}

// ============ 功能1：真实导出画布图片 ============
function exportDesign() {
    showToast('正在生成图片...', 'success');

    setTimeout(() => {
        try {
            const W = 800, H = 1120;
            const targetCanvas = document.createElement('canvas');
            targetCanvas.width = W;
            targetCanvas.height = H;
            const ctx = targetCanvas.getContext('2d');

            const bgEl = document.getElementById('canvasBg');
            const bgStyle = bgEl.style.background || 'linear-gradient(135deg, #f8fafc, #e2e8f0)';

            renderDesignToCanvas(ctx, W, H, bgStyle, appState.canvasElements, 2);

            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, W, H);

            const link = document.createElement('a');
            link.download = `design-${Date.now()}.png`;
            link.href = targetCanvas.toDataURL('image/png');
            link.click();

            showToast('图片已下载！', 'success');
        } catch (e) {
            console.error(e);
            showToast('导出失败，请重试', 'error');
        }
    }, 800);
}

// ============ 保存草稿 ============
function saveDraft() {
    if (appState.canvasElements.length === 0) {
        showToast('画布还是空的，先添加一些元素吧', 'error');
        return;
    }

    const bgEl = document.getElementById('canvasBg');
    const bgStyle = bgEl.style.background;
    let gradientIdx = 0;
    if (bgStyle.includes('#f093fb')) gradientIdx = 1;
    else if (bgStyle.includes('#4facfe')) gradientIdx = 2;
    else if (bgStyle.includes('#43e97b')) gradientIdx = 3;
    else if (bgStyle.includes('#fa709a')) gradientIdx = 4;
    else if (bgStyle.includes('#30cfd0')) gradientIdx = 5;

    const title = appState.currentLevel
        ? `草稿 - 关卡${appState.currentLevel.id}: ${appState.currentLevel.title}`
        : '我的草稿';

    const newId = appState.editingDraftId || Date.now();
    const existingIdx = GameData.galleryWorks.findIndex(w => w.id === newId);

    const draftWork = {
        id: newId,
        title: title,
        author: '我',
        isMine: true,
        status: 'draft',
        likes: 0,
        liked: false,
        views: 0,
        score: 0,
        gradientIdx: gradientIdx,
        background: bgStyle,
        canvasElements: JSON.parse(JSON.stringify(appState.canvasElements)),
        levelId: appState.currentLevel?.id || null,
        scores: null,
        comments: [],
        createdAt: new Date().toISOString()
    };

    if (existingIdx > -1) {
        GameData.galleryWorks[existingIdx] = draftWork;
    } else {
        GameData.galleryWorks.unshift(draftWork);
        GameData.myDrafts.unshift(newId);
        GameData.saveMyDrafts();
    }

    GameData.saveWorks();
    appState.editingDraftId = newId;

    showToast('草稿已保存！', 'success');
}

// ============ 继续编辑草稿 ============
function editDraft(workId) {
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work) return;

    appState.editingDraftId = workId;
    appState.canvasElements = work.canvasElements ? JSON.parse(JSON.stringify(work.canvasElements)) : [];
    appState.lastScores = work.scores || null;

    const canvasContainer = document.getElementById('canvasElements') || document.querySelector('.canvas-elements');
    if (canvasContainer) canvasContainer.innerHTML = '';
    appState.canvasElements.forEach(el => renderCanvasElement(el));

    if (work.background) {
        document.getElementById('canvasBg').style.background = work.background;
    }

    if (work.levelId) {
        const level = GameData.levels.find(l => l.id === work.levelId);
        if (level) {
            appState.currentLevel = level;
            document.getElementById('editorLevelTitle').textContent = `草稿 - 关卡 ${level.id}: ${level.title}`;
        }
    } else {
        document.getElementById('editorLevelTitle').textContent = work.title;
    }

    closeWorkDetail();
    goToPage('editor');
    updateTaskRequirements();
    showToast('已加载草稿，继续编辑吧', 'success');
}

// ============ 功能2：保存作品到作品墙（持久化） ============
function saveToGallery() {
    if (!appState.lastScores) {
        showToast('请先完成评分再保存', 'error');
        return;
    }

    const title = appState.currentLevel
        ? `关卡${appState.currentLevel.id}: ${appState.currentLevel.title}`
        : '我的设计作品';

    const bgEl = document.getElementById('canvasBg');
    const bgStyle = bgEl.style.background;
    let gradientIdx = 0;
    if (bgStyle.includes('#f093fb')) gradientIdx = 1;
    else if (bgStyle.includes('#4facfe')) gradientIdx = 2;
    else if (bgStyle.includes('#43e97b')) gradientIdx = 3;
    else if (bgStyle.includes('#fa709a')) gradientIdx = 4;
    else if (bgStyle.includes('#30cfd0')) gradientIdx = 5;

    const newId = appState.editingDraftId || Date.now();
    const existingIdx = GameData.galleryWorks.findIndex(w => w.id === newId);

    const newWork = {
        id: newId,
        title: title,
        author: '我',
        isMine: true,
        status: 'published',
        likes: 0,
        liked: false,
        views: 0,
        score: appState.lastScores.total,
        gradientIdx: gradientIdx,
        background: bgStyle,
        canvasElements: JSON.parse(JSON.stringify(appState.canvasElements)),
        levelId: appState.currentLevel?.id || null,
        scores: {
            layout: appState.lastScores.layout,
            color: appState.lastScores.color,
            creativity: appState.lastScores.creativity
        },
        comments: [],
        createdAt: new Date().toISOString()
    };

    if (existingIdx > -1) {
        GameData.galleryWorks[existingIdx] = newWork;
        const draftIdx = GameData.myDrafts.indexOf(newId);
        if (draftIdx > -1) {
            GameData.myDrafts.splice(draftIdx, 1);
            GameData.saveMyDrafts();
        }
    } else {
        GameData.galleryWorks.unshift(newWork);
    }

    if (!GameData.myWorks.includes(newId)) {
        GameData.myWorks.unshift(newId);
    }
    GameData.saveWorks();
    GameData.saveMyWorks();

    GameData.user.coins += 50;
    GameData.user.exp += appState.lastScores.total;
    GameData.saveUser();
    document.getElementById('userCoins').textContent = GameData.user.coins;
    document.getElementById('userExp').textContent = GameData.user.exp;

    appState.lastWorkId = newId;
    appState.editingDraftId = null;
    showToast('作品已发布！+50金币', 'success');

    setTimeout(() => {
        goToPage('gallery');
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const mineBtn = document.querySelector('.filter-btn[data-filter="mine"]');
        if (mineBtn) mineBtn.classList.add('active');
        appState.galleryFilter = 'mine';
        renderGallery();
    }, 600);
}

// ============ 功能3：解锁字体 ============
function unlockAsset(type, id, cost, btnEl) {
    const fontKeyMap = { songti: 'SimSun', kaiti: 'KaiTi', bold: 'bold' };
    const fontKey = fontKeyMap[id] || id;
    const font = GameData.fonts[fontKey];

    if (!font) return;

    if (GameData.user.unlockedFonts.includes(fontKey)) {
        showToast('该字体已经解锁了', '');
        return;
    }

    if (GameData.user.coins < cost) {
        showToast(`金币不足！还需要 ${cost - GameData.user.coins} 金币`, 'error');
        return;
    }

    GameData.user.coins -= cost;
    GameData.user.unlockedFonts.push(fontKey);
    GameData.saveUser();

    document.getElementById('userCoins').textContent = GameData.user.coins;
    syncFontUI();

    showToast(`成功解锁「${font.name}」！`, 'success');
}

// ============ 功能4：作品墙渲染与筛选 ============
function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    let works = [...GameData.galleryWorks];
    const filter = appState.galleryFilter;

    if (filter === 'mine') {
        works = works.filter(w => w.isMine && w.status === 'published');
    } else if (filter === 'drafts') {
        works = works.filter(w => w.isMine && w.status === 'draft');
    } else if (filter === 'published') {
        works = works.filter(w => w.status === 'published');
    } else if (filter === 'favorites') {
        works = works.filter(w => GameData.favorites.includes(w.id) && w.status === 'published');
    } else if (filter === 'popular') {
        works = works.filter(w => w.status === 'published').sort((a, b) => b.likes - a.likes);
    } else {
        works = works.filter(w => w.status === 'published');
    }

    if (works.length === 0) {
        const emptyTips = {
            mine: '还没有发布作品，快去设计一个吧！',
            drafts: '还没有草稿，编辑中点击"保存草稿"可随时保存',
            published: '暂无公开作品',
            favorites: '还没有收藏作品',
            popular: '暂无热门作品',
            all: '暂无作品'
        };
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary);">
            <div style="font-size:48px;margin-bottom:12px;">📭</div>
            <p>${emptyTips[filter] || '暂无内容'}</p>
        </div>`;
        return;
    }

    grid.innerHTML = works.map(work => {
        const isFav = GameData.favorites.includes(work.id);
        const isDraft = work.status === 'draft';
        const thumbDataUrl = work.canvasElements ? getDesignThumbnail(work, 400, 500) : null;
        const bgStyle = thumbDataUrl
            ? `background-image: url(${thumbDataUrl}); background-size: cover; background-position: center top;`
            : `background: ${work.background || GameData.gradients[work.gradientIdx % GameData.gradients.length]};`;

        return `
            <div class="gallery-item" onclick="openWorkDetail(${work.id})">
                <div class="work-preview" style="${bgStyle}">
                    ${isDraft ? '<div style="position:absolute;top:8px;left:8px;background:rgba(255,152,0,0.9);color:white;padding:2px 8px;border-radius:4px;font-size:12px;">📝 草稿</div>' : ''}
                    <div class="work-overlay">
                        <span class="work-title">${work.title}</span>
                        <div class="work-stats">
                            <span>❤️ ${work.likes}</span>
                            <span>💬 ${work.comments.length}</span>
                            ${work.score ? `<span>🏆 ${work.score}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="work-info">
                    <span class="work-author">${work.author}${work.isMine ? ' (我)' : ''}</span>
                    ${isDraft
                        ? `<button class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="event.stopPropagation(); editDraft(${work.id})">✏️ 继续编辑</button>`
                        : `<button class="btn-favorite ${isFav ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleFavoriteWork(${work.id}, this)">
                            ${isFav ? '⭐' : '☆'}
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function bindGalleryFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.galleryFilter = btn.dataset.filter;
            renderGallery();
        });
    });
}

function toggleFavoriteWork(workId, btnEl) {
    const idx = GameData.favorites.indexOf(workId);
    if (idx > -1) {
        GameData.favorites.splice(idx, 1);
        showToast('已取消收藏');
    } else {
        GameData.favorites.push(workId);
        showToast('已收藏作品', 'success');
    }
    GameData.saveFavorites();
    renderGallery();

    const id = appState.currentViewingWorkId;
    if (id === workId) {
        const collectBtn = document.getElementById('workDetailCollectBtn');
        if (collectBtn) {
            const isFav = GameData.favorites.includes(id);
            collectBtn.textContent = isFav ? '⭐ 已收藏' : '⭐ 收藏';
        }
    }
}

// ============ 删除评论 ============
function deleteComment(commentId) {
    const workId = appState.currentViewingWorkId;
    if (!workId) return;
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work) return;

    const idx = work.comments.findIndex(c => c.id === commentId);
    if (idx === -1) return;

    work.comments.splice(idx, 1);
    GameData.saveWorks();
    renderComments(work.comments);
    document.getElementById('workCommentsCount').textContent = work.comments.length;
    renderGallery();
    showToast('评论已删除');
}

// ============ 作品详情 ============
function openWorkDetail(id) {
    const work = GameData.galleryWorks.find(w => w.id === id);
    if (!work) return;

    appState.currentViewingWorkId = id;
    if (work.status === 'published') {
        work.views = (work.views || 0) + 1;
        GameData.saveWorks();
    }

    const previewEl = document.getElementById('workLargePreview');
    const detailCanvas = document.getElementById('workDetailCanvas');
    if (work.canvasElements && detailCanvas) {
        previewEl.style.background = 'transparent';
        const W = 400, H = 560;
        detailCanvas.width = W * 2;
        detailCanvas.height = H * 2;
        detailCanvas.style.width = W + 'px';
        detailCanvas.style.height = H + 'px';
        const ctx = detailCanvas.getContext('2d');
        renderDesignToCanvas(ctx, W * 2, H * 2, work.background, work.canvasElements, 2);
    } else {
        previewEl.style.background = work.background || GameData.gradients[work.gradientIdx % GameData.gradients.length];
        if (detailCanvas) {
            const ctx = detailCanvas.getContext('2d');
            ctx.clearRect(0, 0, detailCanvas.width, detailCanvas.height);
        }
    }

    document.getElementById('workDetailTitle').textContent = work.title;
    document.getElementById('workDetailAuthor').textContent = 'by ' + work.author + (work.isMine ? ' (我)' : '') + (work.status === 'draft' ? ' · 草稿' : '');
    document.getElementById('workLikes').textContent = work.likes;
    document.getElementById('workCommentsCount').textContent = work.comments.length;
    document.getElementById('workViews').textContent = (work.views || 0).toLocaleString();
    document.getElementById('workScore').textContent = work.score || '-';

    const isFav = GameData.favorites.includes(id);
    const collectBtn = document.getElementById('workDetailCollectBtn');
    collectBtn.textContent = isFav ? '⭐ 已收藏' : '⭐ 收藏';
    collectBtn.style.display = work.status === 'draft' ? 'none' : '';

    const likeBtn = collectBtn.previousElementSibling;
    if (likeBtn && likeBtn.textContent.includes('点赞')) {
        likeBtn.style.display = work.status === 'draft' ? 'none' : '';
    }

    const commentInput = document.getElementById('commentInput');
    const sendBtn = commentInput?.nextElementSibling;
    if (commentInput) commentInput.style.display = work.status === 'draft' ? 'none' : '';
    if (sendBtn) sendBtn.style.display = work.status === 'draft' ? 'none' : '';

    const scoresContainer = document.getElementById('workScoresContainer');
    if (work.scores) {
        scoresContainer.style.display = '';
        scoresContainer.innerHTML = `
            <div class="work-score-item">
                <span>版式</span>
                <div class="work-score-bar"><div class="work-score-fill" style="width: ${work.scores.layout}%"></div></div>
                <span>${work.scores.layout}</span>
            </div>
            <div class="work-score-item">
                <span>配色</span>
                <div class="work-score-bar"><div class="work-score-fill" style="width: ${work.scores.color}%"></div></div>
                <span>${work.scores.color}</span>
            </div>
            <div class="work-score-item">
                <span>创意</span>
                <div class="work-score-bar"><div class="work-score-fill" style="width: ${work.scores.creativity}%"></div></div>
                <span>${work.scores.creativity}</span>
            </div>
        `;
    } else {
        scoresContainer.style.display = 'none';
    }

    if (work.status === 'draft' && work.isMine) {
        let actionsDiv = document.getElementById('draftActions');
        if (!actionsDiv) {
            actionsDiv = document.createElement('div');
            actionsDiv.id = 'draftActions';
            actionsDiv.style.cssText = 'margin-top:12px;display:flex;gap:8px;';
            scoresContainer.parentNode.insertBefore(actionsDiv, scoresContainer);
        }
        actionsDiv.innerHTML = `
            <button class="btn-primary" onclick="editDraft(${work.id})">✏️ 继续编辑</button>
            <button class="btn-secondary" onclick="deleteWork(${work.id})">🗑️ 删除草稿</button>
        `;
    } else {
        const actionsDiv = document.getElementById('draftActions');
        if (actionsDiv) actionsDiv.remove();
    }

    renderComments(work.comments);
    document.getElementById('workDetailModal').classList.add('active');
}

function deleteWork(workId) {
    const idx = GameData.galleryWorks.findIndex(w => w.id === workId);
    if (idx === -1) return;

    GameData.galleryWorks.splice(idx, 1);

    const mi = GameData.myWorks.indexOf(workId);
    if (mi > -1) { GameData.myWorks.splice(mi, 1); GameData.saveMyWorks(); }

    const di = GameData.myDrafts.indexOf(workId);
    if (di > -1) { GameData.myDrafts.splice(di, 1); GameData.saveMyDrafts(); }

    const fi = GameData.favorites.indexOf(workId);
    if (fi > -1) { GameData.favorites.splice(fi, 1); GameData.saveFavorites(); }

    GameData.saveWorks();
    closeWorkDetail();
    renderGallery();
    showToast('草稿已删除');
}

function closeWorkDetail() {
    document.getElementById('workDetailModal').classList.remove('active');
    appState.currentViewingWorkId = null;
}

function likeWork() {
    const id = appState.currentViewingWorkId;
    if (!id) return;
    const work = GameData.galleryWorks.find(w => w.id === id);
    if (!work) return;
    if (work.liked) {
        showToast('你已经点过赞了');
        return;
    }
    work.likes++;
    work.liked = true;
    document.getElementById('workLikes').textContent = work.likes;
    GameData.saveWorks();
    renderGallery();
    showToast('点赞成功！', 'success');
}

function collectWork() {
    const id = appState.currentViewingWorkId;
    if (!id) return;

    const idx = GameData.favorites.indexOf(id);
    const collectBtn = document.getElementById('workDetailCollectBtn');

    if (idx > -1) {
        GameData.favorites.splice(idx, 1);
        collectBtn.textContent = '⭐ 收藏';
        showToast('已取消收藏');
    } else {
        GameData.favorites.push(id);
        collectBtn.textContent = '⭐ 已收藏';
        showToast('已收藏作品', 'success');
    }
    GameData.saveFavorites();
    renderGallery();
}

// ============ 功能5：评论功能 ============
function renderComments(comments) {
    const container = document.getElementById('commentsSection');
    if (!comments || comments.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">
            还没有评论，快来抢沙发吧~
        </div>`;
        return;
    }
    container.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-avatar">${c.avatar || c.author.charAt(0).toUpperCase()}</div>
            <div class="comment-content" style="flex:1;">
                <span class="comment-author">${c.author}</span>
                <p>${c.content}</p>
            </div>
            ${c.isMine ? `<button class="btn-icon" onclick="deleteComment(${c.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;" title="删除评论">🗑️</button>` : ''}
        </div>
    `).join('');
}

function submitComment() {
    const id = appState.currentViewingWorkId;
    if (!id) return;

    const input = document.getElementById('commentInput');
    const content = input.value.trim();

    if (!content) {
        showToast('请输入评论内容', 'error');
        return;
    }

    const work = GameData.galleryWorks.find(w => w.id === id);
    if (!work) return;

    work.comments.push({
        id: Date.now(),
        author: '我',
        avatar: '我',
        content: content,
        isMine: true
    });

    GameData.saveWorks();
    renderComments(work.comments);
    document.getElementById('workCommentsCount').textContent = work.comments.length;
    input.value = '';
    renderGallery();
    showToast('评论发表成功！', 'success');
}

function useScheme() { showToast('配色方案已应用', 'success'); }
function favoriteScheme() { showToast('已收藏配色方案', 'success'); }
function useTemplate() { showToast('模板加载中...', 'success'); }

// ============ 对战房 ============
function joinQuickBattle() {
    showToast('正在匹配对手...', 'success');
    setTimeout(() => {
        showToast('匹配成功！准备开始对战', 'success');
        setTimeout(() => startLevel(1), 1000);
    }, 2000);
}

function createRoom() {
    const roomId = Math.floor(1000 + Math.random() * 9000);
    showToast(`房间已创建，房间号: ${roomId}`, 'success');
}

function joinRoom() {
    showToast('请输入房间号', '');
}

function goToVoting() {
    document.getElementById('votingSection').style.display = 'block';
    showToast('请为你喜欢的作品投票');
}

function voteFor(player) {
    showToast(`已为选手${player}投票！`, 'success');
    setTimeout(() => {
        document.getElementById('votingSection').style.display = 'none';
        document.getElementById('battleResult').style.display = 'block';
    }, 1000);
}

// ============ 复盘页图表 ============
function drawGrowthChart() {
    const canvas = document.getElementById('growthChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    
    const data = [65, 72, 68, 80, 78, 85, 82, 88, 90, 87, 92, 95];
    const labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((100 - i * 20).toString(), padding.left - 10, y + 4);
    }
    
    const stepX = chartW / (data.length - 1);
    const maxVal = 100;
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');
    
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    data.forEach((val, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + stepX * (data.length - 1), h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    data.forEach((val, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    data.forEach((val, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, h - padding.bottom + 25);
    });
}

function drawRadarChart() {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2 - 50;
    
    const labels = ['版式', '配色', '创意', '可读性', '留白', '字体'];
    const data = [85, 78, 92, 80, 75, 70];
    const angles = labels.map((_, i) => (Math.PI * 2 * i) / labels.length - Math.PI / 2);
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let level = 1; level <= 5; level++) {
        const r = (radius / 5) * level;
        ctx.beginPath();
        angles.forEach((angle, i) => {
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
    }
    
    angles.forEach(angle => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
        ctx.stroke();
    });
    
    ctx.beginPath();
    ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    data.forEach((val, i) => {
        const r = (val / 100) * radius;
        const x = centerX + r * Math.cos(angles[i]);
        const y = centerY + r * Math.sin(angles[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    data.forEach((val, i) => {
        const r = (val / 100) * radius;
        const x = centerX + r * Math.cos(angles[i]);
        const y = centerY + r * Math.sin(angles[i]);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#667eea';
        ctx.fill();
        
        const labelR = radius + 25;
        const lx = centerX + labelR * Math.cos(angles[i]);
        const ly = centerY + labelR * Math.sin(angles[i]);
        ctx.fillStyle = '#475569';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labels[i], lx, ly);
    });
}

// ============ 回放功能 ============
function openReplay(id) {
    document.getElementById('replayModal').classList.add('active');
    appState.currentStep = 0;
    updateReplayUI();
}

function closeReplay() {
    document.getElementById('replayModal').classList.remove('active');
    stopReplay();
}

function replayControl(action) {
    const steps = document.querySelectorAll('.step-item');
    const playBtn = document.getElementById('replayPlayBtn');
    
    if (action === 'play') {
        if (appState.isPlaying) {
            stopReplay();
            playBtn.textContent = '▶️ 播放';
        } else {
            appState.isPlaying = true;
            playBtn.textContent = '⏸️ 暂停';
            appState.replayInterval = setInterval(() => {
                if (appState.currentStep < steps.length - 1) {
                    appState.currentStep++;
                    updateReplayUI();
                } else {
                    stopReplay();
                    playBtn.textContent = '▶️ 重播';
                }
            }, 1500);
        }
    } else if (action === 'prev') {
        appState.currentStep = Math.max(0, appState.currentStep - 1);
        updateReplayUI();
    } else if (action === 'next') {
        appState.currentStep = Math.min(steps.length - 1, appState.currentStep + 1);
        updateReplayUI();
    }
}

function stopReplay() {
    appState.isPlaying = false;
    if (appState.replayInterval) {
        clearInterval(appState.replayInterval);
        appState.replayInterval = null;
    }
}

function updateReplayUI() {
    const steps = document.querySelectorAll('.step-item');
    const timeline = document.getElementById('replayTimeline');
    const timeDisplay = document.getElementById('replayTime');
    
    steps.forEach((s, i) => {
        s.classList.toggle('active', i <= appState.currentStep);
    });
    
    const progress = (appState.currentStep / Math.max(1, steps.length - 1)) * 100;
    if (timeline) timeline.value = progress;
    
    const totalSec = 150;
    const currentSec = Math.floor((progress / 100) * totalSec);
    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    if (timeDisplay) timeDisplay.textContent = `${formatTime(currentSec)} / ${formatTime(totalSec)}`;
}

// ============ 作品集 ============
function generatePortfolio() {
    const title = document.getElementById('portfolioTitleInput').value || '我的作品集';
    const cover = document.querySelector('.portfolio-cover');
    const style = document.getElementById('portfolioStyle').value;
    
    const gradients = {
        modern: 'linear-gradient(135deg, #667eea, #764ba2)',
        creative: 'linear-gradient(135deg, #f093fb, #f5576c)',
        elegant: 'linear-gradient(135deg, #2C3E50, #34495E)'
    };
    
    document.querySelector('.portfolio-preview').style.background = gradients[style] || gradients.modern;
    cover.querySelector('.portfolio-title').textContent = title;
    
    showToast('作品集封面已生成！', 'success');
}

function exportPortfolio() {
    showToast('正在导出作品集...', 'success');
    setTimeout(() => showToast('作品集导出成功！', 'success'), 1500);
}

document.getElementById('portfolioTitleInput')?.addEventListener('input', (e) => {
    document.querySelector('.portfolio-title').textContent = e.target.value || '我的作品集';
});

function shareScore() {
    showToast('成绩卡已复制到剪贴板，快去分享吧！', 'success');
}

function fixMistake(type) {
    showToast(`已修正: ${type === 'contrast' ? '对比度不足' : type}`, 'success');
}

// ============ 全局事件 ============
window.addEventListener('load', init);
window.addEventListener('resize', () => {
    if (appState.currentPage === 'review') {
        drawGrowthChart();
        drawRadarChart();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        stopReplay();
    }
    if (e.key === 'Delete' && appState.selectedElement && appState.currentPage === 'editor') {
        deleteSelectedElement();
    }
});
