const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const comment = JSON.parse(req.body);
    
    // 验证必填字段
    if (!comment.postId || !comment.author || !comment.content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    comment.createdAt = new Date().toISOString();
    
    await client.connect();
    const db = client.db('comments_db');
    const collection = db.collection('comments');
    
    const result = await collection.insertOne(comment);
    
    res.status(200).json({ 
      success: true, 
      id: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
};
