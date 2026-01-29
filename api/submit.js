import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'comments_db';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  
  const client = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const db = client.db(MONGODB_DB);
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

// 简单的垃圾评论检测
function containsSpam(content) {
  const spamKeywords = [
    'http://', 'https://', 'www.', '.com', '.net', 
    'buy', 'cheap', 'discount', 'viagra'
  ];
  
  const lowerContent = content.toLowerCase();
  return spamKeywords.some(keyword => lowerContent.includes(keyword));
}

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    let comment;
    
    // 解析请求体
    if (typeof req.body === 'string') {
      comment = JSON.parse(req.body);
    } else {
      comment = req.body;
    }
    
    // 验证必填字段
    if (!comment.postId || !comment.author || !comment.content) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['postId', 'author', 'content']
      });
    }
    
    // 垃圾评论检测
    if (containsSpam(comment.content)) {
      return res.status(400).json({ 
        error: 'Comment contains suspicious content',
        status: 'pending_review'
      });
    }
    
    // 添加额外字段
    const commentToInsert = {
      ...comment,
      _id: new ObjectId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'approved', // 或 'pending' 如果需要审核
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };
    
    // 如果有email，生成Gravatar哈希
    if (comment.email) {
      const crypto = require('crypto');
      const emailHash = crypto
        .createHash('md5')
        .update(comment.email.trim().toLowerCase())
        .digest('hex');
      commentToInsert.avatar = `https://www.gravatar.com/avatar/${emailHash}?d=identicon`;
    }
    
    const { db } = await connectToDatabase();
    const collection = db.collection('comments');
    
    const result = await collection.insertOne(commentToInsert);
    
    res.status(201).json({ 
      success: true, 
      id: result.insertedId,
      comment: commentToInsert
    });
    
  } catch (error) {
    console.error('Error submitting comment:', error);
    
    // 处理JSON解析错误
    if (error instanceof SyntaxError) {
      return res.status(400).json({ 
        error: 'Invalid JSON format' 
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
