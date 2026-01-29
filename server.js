// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 允许的域名（把你的网站域名加进来）
const allowedOrigins = [
  'https://bamby715-9npjahstm-bamby715s-projects.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('不允许的域名'));
    }
  }
}));

// 连接到 MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bamby-comments', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 创建评论模型
const commentSchema = new mongoose.Schema({
  name: String,
  content: String,
  page: { type: String, default: '/' },
  avatar: String,
  timestamp: { type: Date, default: Date.now },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  likes: { type: Number, default: 0 },
});

const Comment = mongoose.model('Comment', commentSchema);

// 测试路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'BAMBY评论服务器运行中',
    version: '1.0.0',
    routes: [
      'GET /api/comments',
      'POST /api/comments',
      'POST /api/comments/:id/like'
    ]
  });
});

// 获取评论
app.get('/api/comments', async (req, res) => {
  try {
    const { page = '/' } = req.query;
    const comments = await Comment.find({ page, parentId: null })
      .sort({ timestamp: -1 })
      .lean();
    
    // 获取每条评论的回复
    for (let comment of comments) {
      const replies = await Comment.find({ parentId: comment._id })
        .sort({ timestamp: 1 })
        .lean();
      comment.replies = replies;
    }
    
    res.json(comments);
  } catch (error) {
    console.error('获取评论错误:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 提交评论
app.post('/api/comments', async (req, res) => {
  try {
    const { name, content, page, parentId, avatar } = req.body;
    
    // 验证数据
    if (!name || !content) {
      return res.status(400).json({ error: '昵称和评论内容不能为空' });
    }
    
    if (name.length > 20) {
      return res.status(400).json({ error: '昵称不能超过20个字符' });
    }
    
    if (content.length > 500) {
      return res.status(400).json({ error: '评论内容不能超过500个字符' });
    }
    
    // 生成头像（简单方案）
    const generatedAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
    
    const comment = new Comment({
      name: name.substring(0, 20),
      content: content.substring(0, 500),
      page: page || '/',
      parentId: parentId || null,
      avatar: generatedAvatar,
    });
    
    await comment.save();
    
    // 返回完整的评论数据
    const savedComment = comment.toObject();
    if (parentId) {
      savedComment.parentId = parentId;
    }
    
    res.status(201).json({
      ...savedComment,
      replies: []
    });
  } catch (error) {
    console.error('提交评论错误:', error);
    res.status(500).json({ error: '提交评论失败，请稍后再试' });
  }
});

// 点赞评论
app.post('/api/comments/:id/like', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }
    
    comment.likes += 1;
    await comment.save();
    
    res.json({ 
      id: comment._id, 
      likes: comment.likes 
    });
  } catch (error) {
    console.error('点赞错误:', error);
    res.status(500).json({ error: '点赞失败' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 处理404
app.use((req, res) => {
  res.status(404).json({ error: '路由不存在' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`评论服务器运行在端口 ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? '已设置' : '未设置'}`);
});