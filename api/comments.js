const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    await client.connect();
    const db = client.db('comments_db');
    const collection = db.collection('comments');
    
    const { postId } = req.query;
    const comments = await collection
      .find({ postId })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
};
