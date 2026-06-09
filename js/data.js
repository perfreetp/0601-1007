// ============ 游戏数据 ============
const GameData = {
    user: {
        exp: 1250,
        coins: 580,
        level: 8,
        unlockedFonts: ['Noto Sans SC'],
        unlockedThemes: ['music', 'food', 'tech'],
        completedLevels: [1, 2],
        favorites: [],
        works: []
    },

    palettes: {
        vibrant: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7'],
        elegant: ['#2C3E50', '#34495E', '#7F8C8D', '#ECF0F1', '#FFFFFF'],
        nature: ['#2D5016', '#6B8E23', '#9ACD32', '#F0E68C', '#FFFACD'],
        warm: ['#FF4500', '#FF8C00', '#FFD700', '#FFFFE0', '#FFF8DC'],
        ocean: ['#006994', '#40E0D0', '#AFEEEE', '#E0FFFF', '#F0FFFF'],
        sunset: ['#FF6B6B', '#FFA07A', '#FFD93D', '#6BCB77', '#4D96FF']
    },

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

    galleryWorks: [
        { id: 1, title: '夏日音乐节', author: '设计师小明', likes: 128, comments: 24, views: 1024, score: 85 },
        { id: 2, title: '美食嘉年华', author: '创意达人', likes: 96, comments: 18, views: 856, score: 78 },
        { id: 3, title: '科技峰会', author: 'TechDesigner', likes: 156, comments: 32, views: 1280, score: 92 },
        { id: 4, title: '环保公益海报', author: 'GreenArtist', likes: 88, comments: 12, views: 640, score: 80 }
    ],

    dailyTasks: [
        { id: 1, title: '完成1个版式关卡', reward: 50, done: true },
        { id: 2, title: '尝试3种配色方案', reward: 30, done: false },
        { id: 3, title: '收藏1个优秀作品', reward: 20, done: false }
    ]
};
