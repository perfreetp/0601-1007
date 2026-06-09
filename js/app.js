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
    currentViewingWorkId: null,
    replyingToCommentId: null,
    editingDraftId: null,
    batchMode: false,
    selectedWorkIds: [],
    popularTimeRange: 'all',
    adminPanelOpen: false
};

// ============ 图片预加载缓存 ============
const _imgCache = new Map();
function loadImage(url) {
    return new Promise((resolve) => {
        if (_imgCache.has(url)) { resolve(_imgCache.get(url)); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { _imgCache.set(url, img); resolve(img); };
        img.onerror = () => { _imgCache.set(url, null); resolve(null); };
        img.src = url;
    });
}

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
    migrateGalleryWorks();
    appState.popularTimeRange = GameData.popularTimeRange || 'all';
    updateNewCommentBadge();
    document.getElementById('userExp').textContent = GameData.user.exp;
    document.getElementById('userCoins').textContent = GameData.user.coins;
    updateTaskRequirements();
    syncFontUI();
    renderGallery();
    bindGalleryFilters();
    bindCommentEnter();
    bindPopularTimeRange();
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn) {
        adminBtn.onclick = () => {
            document.getElementById('adminPanelModal').classList.add('active');
            openAdminPanel();
        };
    }
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

function _renderBackground(ctx, W, H, bgStyle) {
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
}

function _renderImagePlaceholder(ctx, x, y, w, h, bgColor) {
    const imgGradient = ctx.createLinearGradient(x, y, x + w, y + h);
    const imgColors = parseGradient(bgColor || '#667eea');
    imgGradient.addColorStop(0, imgColors[0]);
    imgGradient.addColorStop(1, imgColors[1]);
    ctx.fillStyle = imgGradient;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `${36 * (w / 150)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖼️', x + w / 2, y + h / 2);
    ctx.textAlign = 'start';
}

// 同步版本（缩略图使用，图片使用占位）
function renderDesignToCanvas(ctx, W, H, bgStyle, elements, scale) {
    scale = scale || 2;
    ctx.clearRect(0, 0, W, H);
    _renderBackground(ctx, W, H, bgStyle);
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
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (el.content === 'line') {
                ctx.fillRect(x, y + 20 * scale, 150 * scale, 4 * scale);
            }
        } else if (el.type === 'image') {
            const imgW = 150 * scale;
            const imgH = 150 * scale;
            _renderImagePlaceholder(ctx, x, y, imgW, imgH, el.bgColor);
        }
    });
}

// 异步版本（导出和详情使用，图片真实渲染）
async function renderDesignToCanvasAsync(ctx, W, H, bgStyle, elements, scale) {
    scale = scale || 2;
    ctx.clearRect(0, 0, W, H);
    _renderBackground(ctx, W, H, bgStyle);
    if (!elements) return;

    for (const el of elements) {
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
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (el.content === 'line') {
                ctx.fillRect(x, y + 20 * scale, 150 * scale, 4 * scale);
            }
        } else if (el.type === 'image') {
            const imgW = 150 * scale;
            const imgH = 150 * scale;
            if (el.content && !el.content.startsWith('data:image/svg')) {
                const realImg = await loadImage(el.content);
                if (realImg) {
                    try {
                        ctx.drawImage(realImg, x, y, imgW, imgH);
                        continue;
                    } catch (e) { /* fall through to placeholder */ }
                }
            }
            _renderImagePlaceholder(ctx, x, y, imgW, imgH, el.bgColor);
        }
    }
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

async function getDesignThumbnailAsync(work, thumbW, thumbH) {
    const bgStyle = work.background || GameData.gradients[work.gradientIdx || 0];
    const cvs = document.createElement('canvas');
    cvs.width = thumbW;
    cvs.height = thumbH;
    const ctx = cvs.getContext('2d');
    const scale = Math.min(thumbW / 400, thumbH / 560);
    await renderDesignToCanvasAsync(ctx, thumbW, thumbH, bgStyle, work.canvasElements, scale);
    return cvs.toDataURL();
}

function _isToday(isoStr) {
    if (!isoStr) return false;
    try {
        const d = new Date(isoStr);
        const today = new Date();
        return d.getFullYear() === today.getFullYear() &&
               d.getMonth() === today.getMonth() &&
               d.getDate() === today.getDate();
    } catch (e) { return false; }
}

function _isThisWeek(isoStr) {
    if (!isoStr) return false;
    try {
        const d = new Date(isoStr);
        const now = new Date();
        const diffMs = now - d;
        return diffMs >= 0 && diffMs <= 7 * 86400000;
    } catch (e) { return false; }
}

function _getWorkScore(work, range) {
    range = range || 'all';
    const likes = work.likes || 0;
    const favs = work.favoriteCount || 0;
    const views = work.views || 0;
    const comments = _totalCommentsCount(work);
    if (range === 'all') {
        return likes * 2 + favs * 3 + views * 0.1 + comments * 1.5;
    }
    let score = 0;
    if (work.viewLog && work.viewLog.length) {
        for (const log of work.viewLog) {
            if (range === 'today' && _isToday(log.date)) {
                score += (log.likes || 0) * 2 + (log.favorites || 0) * 3 + (log.views || 0) * 0.1 + (log.comments || 0) * 1.5;
            } else if (range === 'week' && _isThisWeek(log.date)) {
                score += (log.likes || 0) * 2 + (log.favorites || 0) * 3 + (log.views || 0) * 0.1 + (log.comments || 0) * 1.5;
            }
        }
    }
    if (work.comments && work.comments.length) {
        for (const c of work.comments) {
            const ok = range === 'today' ? _isToday(c.createdAt) : _isThisWeek(c.createdAt);
            if (ok) score += 1.5;
            if (c.replies && c.replies.length) {
                for (const r of c.replies) {
                    const rok = range === 'today' ? _isToday(r.createdAt) : _isThisWeek(r.createdAt);
                    if (rok) score += 1.5;
                }
            }
        }
    }
    return score;
}

function migrateGalleryWorks() {
    let changed = false;
    const today = new Date().toISOString().slice(0, 10);
    for (const work of GameData.galleryWorks) {
        if (work.visibility === undefined) {
            if (work.status === 'draft') work.visibility = 'draft';
            else if (work.isMine && work.status === 'published') work.visibility = 'public';
            else work.visibility = 'public';
            changed = true;
        }
        if (work.favoriteCount === undefined || work.favoriteCount === null) {
            work.favoriteCount = Math.floor(Math.random() * 81) + 10;
            changed = true;
        }
        if (work.views === undefined || work.views === null) {
            work.views = Math.floor(Math.random() * 751) + 50;
            changed = true;
        }
        if (work.pinnedCommentId === undefined) {
            work.pinnedCommentId = null;
            changed = true;
        }
        if (!Array.isArray(work.featuredCommentIds)) {
            work.featuredCommentIds = [];
            changed = true;
        }
        if (work.lastReadCommentAt === undefined || work.lastReadCommentAt === null) {
            work.lastReadCommentAt = null;
            changed = true;
        }
        if (!Array.isArray(work.viewLog)) {
            work.viewLog = [{ date: today, count: 0, likes: 0, favorites: 0, comments: 0 }];
            changed = true;
        }
        if (!work.createdAt) {
            work.createdAt = new Date(Date.now() - Math.random() * 30 * 86400000).toISOString();
            changed = true;
        }
        if (work.comments && work.comments.length) {
            for (const c of work.comments) {
                if (!c.id) { c.id = Date.now() + Math.floor(Math.random() * 1000); changed = true; }
                if (!Array.isArray(c.replies)) { c.replies = []; changed = true; }
                if (c.isMine === undefined) { c.isMine = false; changed = true; }
                if (c.featured === undefined) { c.featured = false; changed = true; }
                if (!c.createdAt) { c.createdAt = new Date().toISOString(); changed = true; }
                if (c.replies && c.replies.length) {
                    for (const r of c.replies) {
                        if (!r.id) { r.id = Date.now() + Math.floor(Math.random() * 1000); changed = true; }
                        if (r.isMine === undefined) { r.isMine = false; changed = true; }
                        if (!r.createdAt) { r.createdAt = new Date().toISOString(); changed = true; }
                    }
                }
            }
        }
    }
    if (changed) GameData.saveWorks();
}

function updateNewCommentBadge() {
    const badge = document.getElementById('newCommentBadge');
    if (!badge) return;
    let count = 0;
    for (const work of GameData.galleryWorks) {
        if (!(work.isMine && work.visibility === 'public')) continue;
        const lastRead = work.lastReadCommentAt ? new Date(work.lastReadCommentAt).getTime() : 0;
        if (work.comments) {
            for (const c of work.comments) {
                if (c.createdAt && new Date(c.createdAt).getTime() > lastRead) count++;
                if (c.replies) {
                    for (const r of c.replies) {
                        if (r.createdAt && new Date(r.createdAt).getTime() > lastRead) count++;
                    }
                }
            }
        }
    }
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.add('show');
        badge.style.display = 'flex';
    } else {
        badge.classList.remove('show');
        badge.style.display = 'none';
    }
}

function bindPopularTimeRange() {
    const container = document.getElementById('popularTimeRange');
    if (!container) return;
    const btns = container.querySelectorAll('.time-range-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = btn.dataset.range;
            appState.popularTimeRange = range;
            GameData.popularTimeRange = range;
            GameData.savePopularTimeRange();
            renderGallery();
        };
    });
}

function toggleFeaturedComment(commentId) {
    const workId = appState.currentViewingWorkId;
    if (!workId) return;
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work || !work.isMine) return;
    if (!Array.isArray(work.featuredCommentIds)) work.featuredCommentIds = [];
    const idx = work.featuredCommentIds.indexOf(commentId);
    if (idx > -1) {
        work.featuredCommentIds.splice(idx, 1);
        showToast('已取消精选');
    } else {
        work.featuredCommentIds.push(commentId);
        showToast('已精选评论', 'success');
    }
    const comment = work.comments.find(c => c.id === commentId);
    if (comment) comment.featured = work.featuredCommentIds.includes(commentId);
    GameData.saveWorks();
    renderComments(work.comments);
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

function getFontCSS(fontFamily) {
    const font = GameData.fonts[fontFamily];
    const cssFamily = font ? font.cssFamily : "'Noto Sans SC', sans-serif";
    if (font && font.cssUrl) {
        const existing = document.querySelector(`link[data-font="${fontFamily}"]`);
        if (!existing) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = font.cssUrl;
            link.setAttribute('data-font', fontFamily);
            document.head.appendChild(link);
        }
    }
    return cssFamily;
}

function _totalCommentsCount(work) {
    if (!work || !work.comments) return 0;
    let total = work.comments.length;
    work.comments.forEach(c => {
        if (c.replies && c.replies.length) {
            total += c.replies.length;
        }
    });
    return total;
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

// ============ 功能1：真实导出画布图片（异步真实图片渲染） ============
async function exportDesign() {
    showToast('正在生成图片...', 'success');

    try {
        const W = 800, H = 1120;
        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = W;
        targetCanvas.height = H;
        const ctx = targetCanvas.getContext('2d');

        const bgEl = document.getElementById('canvasBg');
        const bgStyle = bgEl.style.background || 'linear-gradient(135deg, #f8fafc, #e2e8f0)';

        await renderDesignToCanvasAsync(ctx, W, H, bgStyle, appState.canvasElements, 2);

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
}

// ============ 发布范围弹窗 ============
function openPublishModal() {
    if (!appState.lastScores) {
        showToast('请先完成评分再保存', 'error');
        return;
    }
    document.getElementById('publishModal').classList.add('active');
}
function closePublishModal() {
    document.getElementById('publishModal').classList.remove('active');
}
function confirmPublish() {
    const selected = document.querySelector('input[name="publishVisibility"]:checked');
    const visibility = selected ? selected.value : 'public';
    closePublishModal();
    saveToGallery(visibility);
}

// ============ 保存草稿（带visibility） ============
function _buildWorkBase(visibility) {
    const bgEl = document.getElementById('canvasBg');
    const bgStyle = bgEl.style.background;
    let gradientIdx = 0;
    if (bgStyle.includes('#f093fb')) gradientIdx = 1;
    else if (bgStyle.includes('#4facfe')) gradientIdx = 2;
    else if (bgStyle.includes('#43e97b')) gradientIdx = 3;
    else if (bgStyle.includes('#fa709a')) gradientIdx = 4;
    else if (bgStyle.includes('#30cfd0')) gradientIdx = 5;

    const title = appState.currentLevel
        ? `关卡${appState.currentLevel.id}: ${appState.currentLevel.title}`
        : '我的设计作品';

    const newId = appState.editingDraftId || Date.now();

    return { bgStyle, gradientIdx, title, newId };
}

function saveDraft() {
    if (appState.canvasElements.length === 0) {
        showToast('画布还是空的，先添加一些元素吧', 'error');
        return;
    }
    const { bgStyle, gradientIdx, newId } = _buildWorkBase('draft');
    const existingIdx = GameData.galleryWorks.findIndex(w => w.id === newId);

    const title = appState.currentLevel
        ? `草稿 - 关卡${appState.currentLevel.id}: ${appState.currentLevel.title}`
        : '我的草稿';

    const draftWork = {
        id: newId, title, author: '我', isMine: true,
        status: 'draft', visibility: 'draft',
        likes: 0, liked: false, favoriteCount: 0, views: 0,
        score: 0, gradientIdx, background: bgStyle,
        canvasElements: JSON.parse(JSON.stringify(appState.canvasElements)),
        levelId: appState.currentLevel?.id || null,
        scores: null, comments: [], pinnedCommentId: null,
        createdAt: new Date().toISOString()
    };

    if (existingIdx > -1) {
        GameData.galleryWorks[existingIdx] = draftWork;
    } else {
        GameData.galleryWorks.unshift(draftWork);
        if (!GameData.myDrafts.includes(newId)) {
            GameData.myDrafts.unshift(newId);
            GameData.saveMyDrafts();
        }
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

// ============ 保存作品到作品墙（支持 visibility） ============
function saveToGallery(visibility) {
    if (!appState.lastScores) {
        showToast('请先完成评分再保存', 'error');
        return;
    }
    visibility = visibility || 'public';

    const { bgStyle, gradientIdx, title, newId } = _buildWorkBase(visibility);
    const existingIdx = GameData.galleryWorks.findIndex(w => w.id === newId);

    const status = visibility === 'draft' ? 'draft' : 'published';

    const newWork = {
        id: newId, title, author: '我', isMine: true,
        status: status, visibility: visibility,
        likes: existingIdx > -1 ? GameData.galleryWorks[existingIdx].likes : 0,
        liked: existingIdx > -1 ? GameData.galleryWorks[existingIdx].liked : false,
        favoriteCount: existingIdx > -1 ? (GameData.galleryWorks[existingIdx].favoriteCount || 0) : 0,
        views: existingIdx > -1 ? (GameData.galleryWorks[existingIdx].views || 0) : 0,
        score: appState.lastScores.total,
        gradientIdx, background: bgStyle,
        canvasElements: JSON.parse(JSON.stringify(appState.canvasElements)),
        levelId: appState.currentLevel?.id || null,
        scores: {
            layout: appState.lastScores.layout,
            color: appState.lastScores.color,
            creativity: appState.lastScores.creativity
        },
        comments: existingIdx > -1 ? GameData.galleryWorks[existingIdx].comments || [] : [],
        pinnedCommentId: existingIdx > -1 ? GameData.galleryWorks[existingIdx].pinnedCommentId || null : null,
        createdAt: existingIdx > -1 ? GameData.galleryWorks[existingIdx].createdAt : new Date().toISOString()
    };

    if (existingIdx > -1) {
        GameData.galleryWorks[existingIdx] = newWork;
        const di = GameData.myDrafts.indexOf(newId);
        if (di > -1) { GameData.myDrafts.splice(di, 1); GameData.saveMyDrafts(); }
    } else {
        GameData.galleryWorks.unshift(newWork);
    }

    // 根据 visibility 更新对应列表
    if (visibility === 'private') {
        if (GameData.myPrivate.indexOf(newId) === -1) GameData.myPrivate.unshift(newId);
        GameData.saveMyPrivate();
    } else if (visibility === 'public') {
        if (GameData.myWorks.indexOf(newId) === -1) GameData.myWorks.unshift(newId);
        GameData.saveMyWorks();
    } else if (visibility === 'draft') {
        if (GameData.myDrafts.indexOf(newId) === -1) GameData.myDrafts.unshift(newId);
        GameData.saveMyDrafts();
    }
    GameData.saveWorks();

    if (visibility !== 'draft') {
        GameData.user.coins += 50;
        GameData.user.exp += appState.lastScores.total;
        GameData.saveUser();
        document.getElementById('userCoins').textContent = GameData.user.coins;
        document.getElementById('userExp').textContent = GameData.user.exp;
    }

    appState.lastWorkId = newId;
    appState.editingDraftId = null;

    const tipMap = { draft: '草稿已保存！', private: '已保存为仅自己可见！', public: '作品已发布！+50金币' };
    showToast(tipMap[visibility] || '保存成功', 'success');

    setTimeout(() => {
        goToPage('gallery');
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        let targetFilter = visibility === 'draft' ? 'drafts' : (visibility === 'private' ? 'private' : 'mine');
        const btn = document.querySelector(`.filter-btn[data-filter="${targetFilter}"]`);
        if (btn) btn.classList.add('active');
        appState.galleryFilter = targetFilter;
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

    const timeRangeDiv = document.getElementById('popularTimeRange');
    if (timeRangeDiv) {
        if (filter === 'popular') {
            timeRangeDiv.style.display = 'flex';
            const savedRange = appState.popularTimeRange;
            timeRangeDiv.querySelectorAll('.time-range-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.range === savedRange);
            });
        } else {
            timeRangeDiv.style.display = 'none';
        }
    }

    if (filter === 'mine') {
        works = works.filter(w => w.isMine && w.visibility === 'public');
    } else if (filter === 'drafts') {
        works = works.filter(w => w.isMine && w.status === 'draft');
    } else if (filter === 'private') {
        works = works.filter(w => w.isMine && w.visibility === 'private');
    } else if (filter === 'published') {
        works = works.filter(w => w.visibility === 'public');
    } else if (filter === 'favorites') {
        works = works.filter(w => GameData.favorites.includes(w.id) && w.visibility === 'public');
    } else if (filter === 'popular') {
        const range = appState.popularTimeRange || 'all';
        works = works.filter(w => w.visibility === 'public').sort((a, b) => {
            return _getWorkScore(b, range) - _getWorkScore(a, range);
        });
    } else {
        works = works.filter(w => w.visibility === 'public');
    }

    const showBatchBtn = ['mine', 'drafts', 'private'].includes(filter);
    const batchBar = document.getElementById('batchManageBar');
    if (batchBar) {
        batchBar.style.display = appState.batchMode ? 'flex' : 'none';
        if (appState.batchMode) {
            const countEl = document.getElementById('selectedCountLabel');
            if (countEl) countEl.textContent = `已选 ${appState.selectedWorkIds.length} 项`;
        }
    }
    const batchBtn = document.getElementById('batchManageBtn');
    if (batchBtn) {
        batchBtn.style.display = showBatchBtn ? '' : 'none';
        batchBtn.textContent = appState.batchMode ? '✖ 退出批量' : '☑️ 批量管理';
        batchBtn.onclick = appState.batchMode ? exitBatchMode : enterBatchMode;
    }

    if (works.length === 0) {
        const emptyTips = {
            mine: '还没有发布作品，快去设计一个吧！',
            drafts: '还没有草稿，编辑中点击"保存草稿"可随时保存',
            private: '还没有私密作品',
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

    const defaultBg = GameData.gradients[0] || 'linear-gradient(135deg, #667eea, #764ba2)';
    grid.innerHTML = works.map(work => {
        const isFav = GameData.favorites.includes(work.id);
        const isDraft = work.status === 'draft';
        const isPrivate = work.visibility === 'private';
        const bgStyle = `background: ${work.background || GameData.gradients[(work.gradientIdx || 0) % GameData.gradients.length] || defaultBg};`;
        const isSelected = appState.selectedWorkIds.includes(work.id);
        const totalComments = _totalCommentsCount(work);

        return `
            <div id="card-${work.id}" class="gallery-item ${appState.batchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}" 
                 onclick="${appState.batchMode ? `toggleWorkSelection(${work.id}, this)` : `openWorkDetail(${work.id})`}">
                <div class="work-preview" style="${bgStyle}">
                    ${isDraft ? '<div style="position:absolute;top:8px;left:8px;background:rgba(255,152,0,0.9);color:white;padding:2px 8px;border-radius:4px;font-size:12px;">📝 草稿</div>' : ''}
                    ${isPrivate ? '<div style="position:absolute;top:8px;right:8px;background:rgba(107,114,128,0.9);color:white;padding:2px 8px;border-radius:4px;font-size:12px;">🔒 仅自己可见</div>' : ''}
                    ${appState.batchMode ? `<input type="checkbox" style="position:absolute;top:8px;left:8px;z-index:10;width:20px;height:20px;" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleWorkSelection(${work.id}, this)">` : ''}
                    <div class="work-overlay">
                        <span class="work-title">${work.title}</span>
                        <div class="work-stats">
                            <span>❤️ ${work.likes}</span>
                            <span>⭐ ${work.favoriteCount || 0}</span>
                            <span>💬 ${totalComments}</span>
                            ${work.score ? `<span>🏆 ${work.score}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="work-info">
                    <span class="work-author">${work.author}${work.isMine ? ' (我)' : ''}</span>
                    ${isDraft
                        ? `<button class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="event.stopPropagation(); editDraft(${work.id})">✏️ 继续编辑</button>`
                        : appState.batchMode
                        ? ''
                        : `<button class="btn-favorite ${isFav ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleFavoriteWork(${work.id}, this)">
                            ${isFav ? '⭐' : '☆'}
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        works.forEach(async (work) => {
            if (!work.canvasElements) return;
            try {
                const dataUrl = await getDesignThumbnailAsync(work, 400, 500);
                const card = document.getElementById(`card-${work.id}`);
                if (card) {
                    const preview = card.querySelector('.work-preview');
                    if (preview) {
                        preview.style.backgroundImage = `url(${dataUrl})`;
                        preview.style.backgroundSize = 'cover';
                        preview.style.backgroundPosition = 'center top';
                    }
                }
            } catch (e) {}
        });
    }, 50);
}

function bindGalleryFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            appState.galleryFilter = filter;
            if (filter !== 'popular') {
                const timeDiv = document.getElementById('popularTimeRange');
                if (timeDiv) {
                    timeDiv.querySelectorAll('.time-range-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.range === 'all');
                    });
                    appState.popularTimeRange = 'all';
                    GameData.popularTimeRange = 'all';
                    GameData.savePopularTimeRange();
                }
            }
            if (appState.batchMode) exitBatchMode();
            else renderGallery();
        });
    });
}

function enterBatchMode() {
    appState.batchMode = true;
    appState.selectedWorkIds = [];
    renderGallery();
}

function exitBatchMode() {
    appState.batchMode = false;
    appState.selectedWorkIds = [];
    renderGallery();
}

function toggleWorkSelection(workId, el) {
    const idx = appState.selectedWorkIds.indexOf(workId);
    if (idx > -1) {
        appState.selectedWorkIds.splice(idx, 1);
    } else {
        appState.selectedWorkIds.push(workId);
    }
    renderGallery();
}

function toggleSelectAllWorks(checkboxEl) {
    const filter = appState.galleryFilter;
    let works = [...GameData.galleryWorks];
    if (filter === 'mine') works = works.filter(w => w.isMine && w.status === 'published');
    else if (filter === 'drafts') works = works.filter(w => w.isMine && w.status === 'draft');
    else if (filter === 'private') works = works.filter(w => w.isMine && w.visibility === 'private');

    const workIds = works.map(w => w.id);
    const allSelected = workIds.every(id => appState.selectedWorkIds.includes(id));

    if (allSelected) {
        appState.selectedWorkIds = [];
    } else {
        appState.selectedWorkIds = [...workIds];
    }
    renderGallery();
}

function batchDeleteWorks() {
    if (appState.selectedWorkIds.length === 0) {
        showToast('请先选择要删除的作品', 'error');
        return;
    }
    if (!confirm(`确定要删除选中的 ${appState.selectedWorkIds.length} 个作品吗？此操作不可恢复。`)) return;

    appState.selectedWorkIds.forEach(workId => {
        const idx = GameData.galleryWorks.findIndex(w => w.id === workId);
        if (idx > -1) GameData.galleryWorks.splice(idx, 1);

        const mi = GameData.myWorks.indexOf(workId);
        if (mi > -1) GameData.myWorks.splice(mi, 1);

        const di = GameData.myDrafts.indexOf(workId);
        if (di > -1) GameData.myDrafts.splice(di, 1);

        const pi = GameData.myPrivate.indexOf(workId);
        if (pi > -1) GameData.myPrivate.splice(pi, 1);

        const fi = GameData.favorites.indexOf(workId);
        if (fi > -1) GameData.favorites.splice(fi, 1);
    });

    GameData.saveWorks();
    GameData.saveMyWorks();
    GameData.saveMyDrafts();
    GameData.saveMyPrivate();
    GameData.saveFavorites();

    appState.selectedWorkIds = [];
    appState.batchMode = false;
    renderGallery();
    showToast('批量删除成功！', 'success');
}

async function batchExportWorks() {
    if (appState.selectedWorkIds.length === 0) {
        showToast('请先选择要导出的作品', 'error');
        return;
    }

    const total = appState.selectedWorkIds.length;
    const W = 800, H = 1120;
    const ts = Date.now();

    const progressEl = document.createElement('div');
    progressEl.className = 'batch-progress';
    progressEl.innerHTML = `
        <div class="batch-progress-title">📥 批量导出中</div>
        <div class="batch-progress-bar"><div class="batch-progress-bar-fill" style="width:0%"></div></div>
        <div class="batch-progress-text">0/${total}</div>
    `;
    document.body.appendChild(progressEl);
    const barFill = progressEl.querySelector('.batch-progress-bar-fill');
    const progressText = progressEl.querySelector('.batch-progress-text');

    try {
        for (let i = 0; i < total; i++) {
            const workId = appState.selectedWorkIds[i];
            const work = GameData.galleryWorks.find(w => w.id === workId);
            if (work && work.canvasElements) {
                const targetCanvas = document.createElement('canvas');
                targetCanvas.width = W;
                targetCanvas.height = H;
                const ctx = targetCanvas.getContext('2d');

                const bgStyle = work.background || GameData.gradients[work.gradientIdx || 0];
                await renderDesignToCanvasAsync(ctx, W, H, bgStyle, work.canvasElements, 2);

                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, W, H);

                const safeTitle = (work.title || 'design').replace(/[\\/:*?"<>|]/g, '_');
                const link = document.createElement('a');
                link.download = `${safeTitle}-${i + 1}-${ts}.png`;
                link.href = targetCanvas.toDataURL('image/png');
                link.click();
                await new Promise(r => setTimeout(r, 500));
            }
            const pct = Math.round(((i + 1) / total) * 100);
            if (barFill) barFill.style.width = pct + '%';
            if (progressText) progressText.textContent = `已导出 ${i + 1}/${total}`;
        }
        showToast('批量导出完成！', 'success');
    } catch (e) {
        showToast('导出过程中出错', 'error');
    }

    setTimeout(() => {
        if (progressEl.parentNode) progressEl.parentNode.removeChild(progressEl);
    }, 1500);
}

function toggleFavoriteWork(workId, btnEl) {
    const idx = GameData.favorites.indexOf(workId);
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work) return;

    if (idx > -1) {
        GameData.favorites.splice(idx, 1);
        work.favoriteCount = Math.max(0, (work.favoriteCount || 0) - 1);
        showToast('已取消收藏');
    } else {
        GameData.favorites.push(workId);
        work.favoriteCount = (work.favoriteCount || 0) + 1;
        showToast('已收藏作品', 'success');
    }
    GameData.saveFavorites();
    GameData.saveWorks();
    renderGallery();

    const id = appState.currentViewingWorkId;
    if (id === workId) {
        const collectBtn = document.getElementById('workDetailCollectBtn');
        if (collectBtn) {
            const isFav = GameData.favorites.includes(id);
            collectBtn.textContent = isFav ? '⭐ 已收藏' : '⭐ 收藏';
        }
        const favCountEl = document.getElementById('workFavorites');
        if (favCountEl) favCountEl.textContent = work.favoriteCount || 0;
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
    if (work.pinnedCommentId === commentId) work.pinnedCommentId = null;
    GameData.saveWorks();
    renderComments(work.comments);
    document.getElementById('workCommentsCount').textContent = _totalCommentsCount(work);
    renderGallery();
    showToast('评论已删除');
}

// ============ 功能5：评论功能 ============
function renderComments(comments) {
    const container = document.getElementById('commentsSection');
    const workId = appState.currentViewingWorkId;
    const work = GameData.galleryWorks.find(w => w.id === workId);
    const isWorkAuthor = work && work.isMine;
    const featuredIds = work?.featuredCommentIds || [];

    if (!comments || comments.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">
            还没有评论，快来抢沙发吧~
        </div>`;
        return;
    }

    const pinned = comments.find(c => c.id === work?.pinnedCommentId);
    const featured = comments.filter(c => c.id !== work?.pinnedCommentId && featuredIds.includes(c.id));
    const normalComments = comments.filter(c => c.id !== work?.pinnedCommentId && !featuredIds.includes(c.id));
    const ordered = [];
    if (pinned) ordered.push(pinned);
    ordered.push(...featured);
    ordered.push(...normalComments);

    container.innerHTML = ordered.map(c => {
        const isPinned = c.id === work?.pinnedCommentId;
        const isFeatured = featuredIds.includes(c.id);
        const canPin = isWorkAuthor && (c.isMine || c.author === work?.author);
        const classes = ['comment-item'];
        if (isPinned) classes.push('pinned');
        if (isFeatured) classes.push('featured');

        let repliesHtml = '';
        if (c.replies && c.replies.length) {
            repliesHtml = `<div style="margin-top:10px;padding-left:12px;border-left:2px solid #e2e8f0;display:flex;flex-direction:column;gap:8px;">
                ${c.replies.map(r => `
                    <div id="reply-${r.id}" style="padding:8px;background:#f8fafc;border-radius:6px;font-size:13px;">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                            <span style="font-weight:600;color:#334155;">${r.author}</span>
                            <span style="color:#94a3b8;font-size:11px;">${r.createdAt || ''}</span>
                            ${r.isMine ? `<button class="btn-icon" onclick="deleteReply(${c.id}, ${r.id})" style="margin-left:auto;background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;" title="删除回复">🗑️</button>` : ''}
                        </div>
                        <div style="color:#475569;">${r.content}</div>
                    </div>
                `).join('')}
            </div>`;
        }

        const replyFormHtml = appState.replyingToCommentId === c.id ? `
            <div id="replyForm-${c.id}" style="margin-top:10px;display:flex;gap:8px;">
                <input type="text" id="replyInput-${c.id}" placeholder="写下你的回复..." style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
                <button class="btn-primary" style="padding:8px 16px;font-size:13px;" onclick="submitReply(${c.id})">发送</button>
                <button class="btn-secondary" style="padding:8px 12px;font-size:13px;" onclick="cancelReply()">取消</button>
            </div>
        ` : '';

        return `
            <div id="comment-${c.id}" class="${classes.join(' ')}" style="padding:12px;border-radius:8px;margin-bottom:10px;">
                <div class="comment-avatar" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;">${c.avatar || c.author.charAt(0).toUpperCase()}</div>
                <div class="comment-content" style="flex:1;margin-left:10px;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                        ${isPinned ? '<span style="background:#f59e0b;color:white;padding:1px 6px;border-radius:4px;font-size:11px;">📌 置顶</span>' : ''}
                        ${isFeatured ? '<span class="comment-featured-badge">⭐ 精选</span>' : ''}
                        <span class="comment-author" style="font-weight:600;color:#334155;">${c.author}</span>
                        <span style="color:#94a3b8;font-size:11px;">${c.createdAt || ''}</span>
                        <div style="margin-left:auto;display:flex;gap:4px;">
                            <button class="btn-icon" onclick="openReply(${c.id})" style="background:none;border:none;color:#667eea;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;" title="回复">💬 回复</button>
                            ${canPin ? `<button class="btn-icon" onclick="pinComment(${c.id})" style="background:none;border:none;color:${isPinned ? '#f59e0b' : '#94a3b8'};cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;" title="置顶">📌</button>` : ''}
                            ${canPin ? `<button class="btn-icon" onclick="toggleFeaturedComment(${c.id})" style="background:none;border:none;color:${isFeatured ? '#f59e0b' : '#94a3b8'};cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;" title="精选">${isFeatured ? '⭐ 取消精选' : '⭐ 精选'}</button>` : ''}
                            ${c.isMine ? `<button class="btn-icon" onclick="deleteComment(${c.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;" title="删除评论">🗑️</button>` : ''}
                        </div>
                    </div>
                    <p style="color:#475569;margin:4px 0 0 0;">${c.content}</p>
                    ${repliesHtml}
                    ${replyFormHtml}
                </div>
            </div>
        `;
    }).join('');
}

function openReply(commentId) {
    appState.replyingToCommentId = commentId;
    const work = GameData.galleryWorks.find(w => w.id === appState.currentViewingWorkId);
    if (work) renderComments(work.comments);
    setTimeout(() => {
        const input = document.getElementById(`replyInput-${commentId}`);
        if (input) input.focus();
    }, 50);
}

function cancelReply() {
    appState.replyingToCommentId = null;
    const work = GameData.galleryWorks.find(w => w.id === appState.currentViewingWorkId);
    if (work) renderComments(work.comments);
}

function submitReply(commentId) {
    const workId = appState.currentViewingWorkId;
    if (!workId) return;
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work) return;

    const input = document.getElementById(`replyInput-${commentId}`);
    const content = input?.value.trim();
    if (!content) {
        showToast('请输入回复内容', 'error');
        return;
    }

    const comment = work.comments.find(c => c.id === commentId);
    if (!comment) return;
    if (!comment.replies) comment.replies = [];

    comment.replies.push({
        id: Date.now(),
        author: '我',
        avatar: '我',
        content: content,
        isMine: true,
        createdAt: new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    GameData.saveWorks();
    appState.replyingToCommentId = null;
    renderComments(work.comments);
    document.getElementById('workCommentsCount').textContent = _totalCommentsCount(work);
    renderGallery();
    showToast('回复成功！', 'success');
}

function pinComment(commentId) {
    const workId = appState.currentViewingWorkId;
    if (!workId) return;
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work || !work.isMine) return;

    work.pinnedCommentId = work.pinnedCommentId === commentId ? null : commentId;
    GameData.saveWorks();
    renderComments(work.comments);
    showToast(work.pinnedCommentId ? '已置顶评论' : '已取消置顶');
}

function deleteReply(commentId, replyId) {
    const workId = appState.currentViewingWorkId;
    if (!workId) return;
    const work = GameData.galleryWorks.find(w => w.id === workId);
    if (!work) return;

    const comment = work.comments.find(c => c.id === commentId);
    if (!comment || !comment.replies) return;

    const idx = comment.replies.findIndex(r => r.id === replyId);
    if (idx === -1) return;
    comment.replies.splice(idx, 1);

    GameData.saveWorks();
    renderComments(work.comments);
    document.getElementById('workCommentsCount').textContent = _totalCommentsCount(work);
    renderGallery();
    showToast('回复已删除');
}

// ============ 作品详情 ============
async function openWorkDetail(id) {
    const work = GameData.galleryWorks.find(w => w.id === id);
    if (!work) return;

    if (work.visibility === 'private' && !work.isMine) {
        showToast('该作品为私密作品，仅作者可见', 'error');
        return;
    }

    appState.currentViewingWorkId = id;
    appState.replyingToCommentId = null;
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
        await renderDesignToCanvasAsync(ctx, W * 2, H * 2, work.background, work.canvasElements, 2);
    } else {
        previewEl.style.background = work.background || GameData.gradients[work.gradientIdx % GameData.gradients.length];
        if (detailCanvas) {
            const ctx = detailCanvas.getContext('2d');
            ctx.clearRect(0, 0, detailCanvas.width, detailCanvas.height);
        }
    }

    let visibilityTag = '';
    if (work.visibility === 'private') visibilityTag = ' 🔒私密';
    else if (work.visibility === 'draft' || work.status === 'draft') visibilityTag = ' 📝草稿';
    else visibilityTag = ' 🌍公开';

    document.getElementById('workDetailTitle').textContent = work.title;
    document.getElementById('workDetailAuthor').textContent = 'by ' + work.author + (work.isMine ? ' (我)' : '') + visibilityTag;
    document.getElementById('workLikes').textContent = work.likes;
    document.getElementById('workFavorites').textContent = work.favoriteCount || 0;
    document.getElementById('workCommentsCount').textContent = _totalCommentsCount(work);
    document.getElementById('workViews').textContent = (work.views || 0).toLocaleString();
    document.getElementById('workScore').textContent = work.score || '-';

    const isFav = GameData.favorites.includes(id);
    const collectBtn = document.getElementById('workDetailCollectBtn');
    collectBtn.textContent = isFav ? '⭐ 已收藏' : '⭐ 收藏';
    const isInteractionDisabled = work.status === 'draft' || (work.visibility === 'private' && !work.isMine);
    collectBtn.style.display = isInteractionDisabled ? 'none' : '';

    const likeBtn = collectBtn.previousElementSibling;
    if (likeBtn && likeBtn.textContent.includes('点赞')) {
        likeBtn.style.display = isInteractionDisabled ? 'none' : '';
    }

    const commentInput = document.getElementById('commentInput');
    const sendBtn = commentInput?.nextElementSibling;
    if (commentInput) commentInput.style.display = isInteractionDisabled ? 'none' : '';
    if (sendBtn) sendBtn.style.display = isInteractionDisabled ? 'none' : '';

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
    work.lastReadCommentAt = new Date().toISOString();
    GameData.saveWorks();
    updateNewCommentBadge();
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
    const work = GameData.galleryWorks.find(w => w.id === id);
    if (!work) return;

    const idx = GameData.favorites.indexOf(id);
    const collectBtn = document.getElementById('workDetailCollectBtn');

    if (idx > -1) {
        GameData.favorites.splice(idx, 1);
        work.favoriteCount = Math.max(0, (work.favoriteCount || 0) - 1);
        collectBtn.textContent = '⭐ 收藏';
        showToast('已取消收藏');
    } else {
        GameData.favorites.push(id);
        work.favoriteCount = (work.favoriteCount || 0) + 1;
        collectBtn.textContent = '⭐ 已收藏';
        showToast('已收藏作品', 'success');
    }
    GameData.saveFavorites();
    GameData.saveWorks();
    const favCountEl = document.getElementById('workFavorites');
    if (favCountEl) favCountEl.textContent = work.favoriteCount || 0;
    renderGallery();
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
        isMine: true,
        replies: [],
        createdAt: new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    GameData.saveWorks();
    renderComments(work.comments);
    document.getElementById('workCommentsCount').textContent = _totalCommentsCount(work);
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

// ============ 运营面板 ============
function openAdminPanel() {
    appState.adminPanelOpen = true;
    renderAdminSummary();
    renderAdminTrendList();
    renderAdminLatestComments();
}

function renderAdminSummary() {
    const container = document.getElementById('adminSummary');
    if (!container) return;
    const publicWorks = GameData.galleryWorks.filter(w => w.visibility === 'public');
    let totalLikes = 0, totalFavs = 0, totalComments = 0, totalViews = 0;
    publicWorks.forEach(w => {
        totalLikes += w.likes || 0;
        totalFavs += w.favoriteCount || 0;
        totalViews += w.views || 0;
        totalComments += _totalCommentsCount(w);
    });
    container.innerHTML = `
        <div class="admin-stat-card">
            <div class="stat-num">${publicWorks.length}</div>
            <div class="stat-label">公开作品数</div>
        </div>
        <div class="admin-stat-card">
            <div class="stat-num">${totalLikes}</div>
            <div class="stat-label">总点赞</div>
        </div>
        <div class="admin-stat-card">
            <div class="stat-num">${totalFavs}</div>
            <div class="stat-label">总收藏</div>
        </div>
        <div class="admin-stat-card">
            <div class="stat-num">${totalComments}</div>
            <div class="stat-label">总评论</div>
        </div>
    `;
}

function renderAdminTrendList() {
    const container = document.getElementById('adminTrendList');
    if (!container) return;
    const works = GameData.galleryWorks
        .filter(w => w.visibility === 'public')
        .sort((a, b) => _getWorkScore(b, 'all') - _getWorkScore(a, 'all'))
        .slice(0, 10);

    if (works.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">暂无公开作品</div>';
        return;
    }

    container.innerHTML = works.map((w, i) => {
        const rankClass = i < 3 ? `r${i + 1}` : '';
        return `
            <div class="admin-trend-item" onclick="openWorkDetail(${w.id}); document.getElementById('adminPanelModal').classList.remove('active');">
                <div class="admin-trend-rank ${rankClass}">${i + 1}</div>
                <div class="admin-trend-title">${w.title}</div>
                <div class="admin-trend-stats">
                    <span>❤️ ${w.likes || 0}</span>
                    <span>⭐ ${w.favoriteCount || 0}</span>
                    <span>💬 ${_totalCommentsCount(w)}</span>
                    <span>👁️ ${w.views || 0}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderAdminLatestComments() {
    const container = document.getElementById('adminLatestComments');
    if (!container) return;
    const all = [];
    GameData.galleryWorks.forEach(w => {
        if (w.visibility !== 'public') return;
        if (w.comments) {
            w.comments.forEach(c => {
                all.push({ type: 'comment', work: w, workId: w.id, workTitle: w.title, author: c.author, content: c.content, createdAt: c.createdAt });
                if (c.replies) {
                    c.replies.forEach(r => {
                        all.push({ type: 'reply', work: w, workId: w.id, workTitle: w.title, author: r.author, content: r.content, createdAt: r.createdAt });
                    });
                }
            });
        }
    });
    all.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
    });
    const top = all.slice(0, 10);
    if (top.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">暂无评论</div>';
        return;
    }
    container.innerHTML = top.map(item => `
        <div class="admin-comment-item" onclick="openWorkDetail(${item.workId}); document.getElementById('adminPanelModal').classList.remove('active');" style="cursor:pointer;">
            <span class="c-author">${item.author}</span>
            <span class="c-work"> · ${item.workTitle}</span>
            <div class="c-content">${item.content}</div>
        </div>
    `).join('');
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
