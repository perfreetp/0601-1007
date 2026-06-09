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
    dragData: null
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
}

// 绑定导航按钮
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
        el.style.fontFamily = element.fontFamily;
        el.style.fontWeight = element.fontWeight;
    } else if (element.type === 'image') {
        const img = document.createElement('img');
        img.src = element.content;
        img.style.width = '150px';
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
                       oninput="updateElementProp('fontSize', this.value); this.nextElementSibling.textContent = this.value + 'px'">
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
            <input type="number" value="${Math.round(element.x)}" onchange="updateElementProp('x', this.value)">
        </div>
        <div class="prop-group">
            <label>位置 Y</label>
            <input type="number" value="${Math.round(element.y)}" onchange="updateElementProp('y', this.value)">
        </div>
        <button class="btn-secondary" style="width:100%;margin-top:12px;background:#fee;color:#c00;border-color:#fcc;" 
                onclick="deleteSelectedElement()">删除元素</button>
    `;
    
    panel.innerHTML = html;
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
        if (prop === 'fontFamily') domEl.style.fontFamily = value;
        if (prop === 'content') domEl.textContent = value;
        if (prop === 'bgColor') {
            const shape = domEl.querySelector('[class^="shape-"]');
            if (shape) shape.style.background = value;
        }
    }
    
    if (prop === 'fontSize' || prop === 'color') {
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

function selectFont(fontName) {
    if (!appState.selectedElement || appState.selectedElement.type !== 'text') {
        showToast('请先选择文字元素', 'error');
        return;
    }
    updateElementProp('fontFamily', fontName);
    showToast(`字体已切换为: ${fontName}`);
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

// ============ 评分页面功能 ============
function fixMistake(type) {
    showToast(`已修正: ${type === 'contrast' ? '对比度不足' : type}`, 'success');
}

function exportDesign() {
    showToast('正在导出练习图...', 'success');
    setTimeout(() => showToast('导出成功！图片已保存', 'success'), 1500);
}

function saveToGallery() {
    showToast('作品已保存到作品墙', 'success');
}

function shareScore() {
    showToast('成绩卡已复制到剪贴板，快去分享吧！', 'success');
}

// ============ 素材仓库 ============
document.querySelectorAll('.asset-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.asset-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
    });
});

function unlockAsset(type, id, cost) {
    if (GameData.user.coins < cost) {
        showToast('金币不足，完成更多任务获取金币', 'error');
        return;
    }
    GameData.user.coins -= cost;
    document.getElementById('userCoins').textContent = GameData.user.coins;
    showToast('解锁成功！', 'success');
}

function useScheme() { showToast('配色方案已应用', 'success'); }
function favoriteScheme() { showToast('已收藏配色方案', 'success'); }
function useTemplate() { showToast('模板加载中...', 'success'); }

// ============ 作品墙 ============
function toggleFavorite(btn) {
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        btn.textContent = '☆';
        showToast('已取消收藏');
    } else {
        btn.classList.add('active');
        btn.textContent = '⭐';
        showToast('已收藏作品', 'success');
    }
}

function openWorkDetail(id) {
    const work = GameData.galleryWorks.find(w => w.id === id);
    if (!work) return;
    
    const gradients = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)'
    ];
    
    document.getElementById('workLargePreview').style.background = gradients[(id - 1) % gradients.length];
    document.getElementById('workDetailTitle').textContent = work.title;
    document.getElementById('workLikes').textContent = work.likes;
    document.getElementById('workComments').textContent = work.comments;
    document.getElementById('workViews').textContent = work.views.toLocaleString();
    
    document.getElementById('workDetailModal').classList.add('active');
}

function closeWorkDetail() {
    document.getElementById('workDetailModal').classList.remove('active');
}

function likeWork() { showToast('点赞成功！', 'success'); }
function collectWork() { showToast('收藏成功！', 'success'); }

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
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
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
        ctx.arc(x, y, 5, 0, Math.PI * 2);
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

// ============ 初始化 ============
function init() {
    document.getElementById('userExp').textContent = GameData.user.exp;
    document.getElementById('userCoins').textContent = GameData.user.coins;
    updateTaskRequirements();
}

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
