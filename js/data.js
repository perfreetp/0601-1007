// ============ 本地存储辅助函数 ============
const Storage = {
    get(key, defaultValue) {
        try {
            const saved = localStorage.getItem('designquest_' + key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem('designquest_' + key, JSON.stringify(value));
        } catch (e) {}
    }
};

// ============ 游戏数据 ============
const GameData = {
    fonts: {
        'Noto Sans SC': { name: '思源黑体', cssFamily: "'Noto Sans SC', sans-serif", unlocked: true, price: 0 },
        'SimSun': { name: '宋体', cssFamily: 'SimSun, serif', unlocked: false, price: 500 },
        'KaiTi': { name: '楷体', cssFamily: 'KaiTi, cursive', unlocked: false, price: 800 },
        'bold': { name: '粗体黑', cssFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, unlocked: false, price: 300 }
    },

    user: Storage.get('user', {
        exp: 1250,
        coins: 580,
        level: 8,
        unlockedFonts: ['Noto Sans SC']
    }),

    palettes: {
        vibrant: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7'],
        elegant: ['#2C3E50', '#34495E', '#7F8C8D', '#ECF0F1', '#FFFFFF'],
        nature: ['#2D5016', '#6B8E23', '#9ACD32', '#F0E68C', '#FFFACD'],
        warm: ['#FF4500', '#FF8C00', '#FFD700', '#FFFFE0', '#FFF8DC'],
        ocean: ['#006994', '#40E0D0', '#AFEEEE', '#E0FFFF', '#F0FFFF'],
        sunset: ['#FF6B6B', '#FFA07A', '#FFD93D', '#6BCB77', '#4D96FF']
    },

    gradients: [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #30cfd0, #330867)'
    ],

    courses: {
        layout: {
            name: '版式设计基础',
            lessons: [
                { id: 1, title: '对齐原则', desc: '元素对齐创造秩序感', done: true },
                { id: 2, title: '对比原则', desc: '差异制造视觉焦点', done: true },
                { id: 3, title: '重复原则', desc: '重复元素增加统一性', done: true },
                { id: 4, title: '亲密性原则', desc: '相关元素靠近 grouping', done: false },
                { id: 5, title: '层次结构', desc: '建立清晰的信息层级', done: false }
            ]
        },
        color: {
            name: '配色理论',
            lessons: [
                { id: 1, title: '色轮基础', desc: '认识三原色、间色和复色', done: true },
                { id: 2, title: '色彩心理', desc: '不同颜色的情感暗示', done: true },
                { id: 3, title: '互补色搭配', desc: '色轮对面颜色的搭配', done: false },
                { id: 4, title: '类似色搭配', desc: '相邻颜色的和谐搭配', done: false },
                { id: 5, title: '三色搭配', desc: '等距三角配色法', done: false }
            ]
        },
        typography: {
            name: '字体排版',
            lessons: [
                { id: 1, title: '字体分类', desc: '衬线体、无衬线体等', done: true },
                { id: 2, title: '字号层级', desc: '建立清晰的字号体系', done: false },
                { id: 3, title: '字间距行距', desc: '调整可读性的关键', done: false },
                { id: 4, title: '字体搭配', desc: '多字体的和谐组合', done: false },
                { id: 5, title: '段落排版', desc: '长文本的排版技巧', done: false }
            ]
        },
        whitespace: {
            name: '留白艺术',
            lessons: [
                { id: 1, title: '什么是留白', desc: '认识负空间的价值', done: false },
                { id: 2, title: '呼吸感营造', desc: '给元素足够的空间', done: false },
                { id: 3, title: '留白与节奏', desc: '用留白创造视觉节奏', done: false },
                { id: 4, title: '极简风格', desc: '少即是多的设计哲学', done: false },
                { id: 5, title: '留白实战', desc: '综合案例练习', done: false }
            ]
        }
    },

    levels: [
        {
            id: 1,
            title: '基础排版',
            theme: 'music',
            difficulty: 'easy',
            timeLimit: 600,
            requirements: ['标题', '副标题', '图片', '正文'],
            tips: '注意对齐和层次'
        },
        {
            id: 2,
            title: '色彩搭配',
            theme: 'food',
            difficulty: 'easy',
            timeLimit: 600,
            requirements: ['主色', '辅助色', '强调色'],
            tips: '使用配色方案快速搭配'
        },
        {
            id: 3,
            title: '留白挑战',
            theme: 'art',
            difficulty: 'normal',
            timeLimit: 900,
            requirements: ['留白>40%', '不超过5个元素'],
            tips: '大胆留白，少即是多'
        }
    ],

    galleryWorks: Storage.get('works', [
        { id: 1, title: '夏日音乐节', author: '设计师小明', isMine: false, status: 'published', likes: 128, liked: false, views: 1024, score: 85, gradientIdx: 0, background: 'linear-gradient(135deg, #667eea, #764ba2)', canvasElements: null, scores: { layout: 90, color: 85, creativity: 92 }, comments: [
            { id: 101, author: 'UserA', avatar: 'A', content: '配色很棒！学习了~', isMine: false },
            { id: 102, author: 'UserB', avatar: 'B', content: '排版很有创意！', isMine: false }
        ]},
        { id: 2, title: '美食嘉年华', author: '创意达人', isMine: false, status: 'published', likes: 96, liked: false, views: 856, score: 78, gradientIdx: 1, background: 'linear-gradient(135deg, #f093fb, #f5576c)', canvasElements: null, scores: { layout: 78, color: 82, creativity: 75 }, comments: [
            { id: 201, author: 'FoodLover', avatar: 'F', content: '看着就有食欲！', isMine: false }
        ]},
        { id: 3, title: '科技峰会', author: 'TechDesigner', isMine: false, status: 'published', likes: 156, liked: false, views: 1280, score: 92, gradientIdx: 2, background: 'linear-gradient(135deg, #4facfe, #00f2fe)', canvasElements: null, scores: { layout: 95, color: 90, creativity: 90 }, comments: [
            { id: 301, author: 'Geek', avatar: 'G', content: '未来感十足', isMine: false }
        ]},
        { id: 4, title: '环保公益海报', author: 'GreenArtist', isMine: false, status: 'published', likes: 88, liked: false, views: 640, score: 80, gradientIdx: 3, background: 'linear-gradient(135deg, #43e97b, #38f9d7)', canvasElements: null, scores: { layout: 80, color: 85, creativity: 78 }, comments: [] },
        { id: 5, title: '艺术展览', author: 'ArtLover', isMine: false, status: 'published', likes: 203, liked: false, views: 1536, score: 91, gradientIdx: 4, background: 'linear-gradient(135deg, #fa709a, #fee140)', canvasElements: null, scores: { layout: 88, color: 92, creativity: 95 }, comments: [] },
        { id: 6, title: '运动会海报', author: 'SportDesign', isMine: false, status: 'published', likes: 167, liked: false, views: 1100, score: 87, gradientIdx: 5, background: 'linear-gradient(135deg, #30cfd0, #330867)', canvasElements: null, scores: { layout: 85, color: 88, creativity: 89 }, comments: [] }
    ]),

    favorites: Storage.get('favorites', [3, 6, 1]),
    myWorks: Storage.get('myWorks', []),
    myDrafts: Storage.get('myDrafts', []),

    dailyTasks: [
        { id: 1, title: '完成1个版式关卡', reward: 50, done: true },
        { id: 2, title: '尝试3种配色方案', reward: 30, done: false },
        { id: 3, title: '收藏1个优秀作品', reward: 20, done: false }
    ],

    saveUser() { Storage.set('user', this.user); },
    saveWorks() { Storage.set('works', this.galleryWorks); },
    saveFavorites() { Storage.set('favorites', this.favorites); },
    saveMyWorks() { Storage.set('myWorks', this.myWorks); },
    saveMyDrafts() { Storage.set('myDrafts', this.myDrafts); }
};
