export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('GET /api/comments called with:', req.query);
  
  try {
    // 暂时返回模拟数据
    const mockComments = [
      {
        _id: 'test-1',
        postId: req.query.postId || 'default',
        author: '测试用户',
        content: '这是一条测试评论',
        createdAt: new Date().toISOString(),
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      {
        _id: 'test-2', 
        postId: req.query.postId || 'default',
        author: '另一个用户',
        content: '第二条测试评论',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        avatar: 'https://i.pravatar.cc/150?img=2'
      }
    ];
    
    return res.status(200).json(mockComments);
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
