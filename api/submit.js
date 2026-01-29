export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('POST /api/submit called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      body = req.body || {};
    }
    
    console.log('Received body:', body);
    
    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: 'Comment saved successfully (mock)',
      id: 'mock-' + Date.now(),
      comment: {
        ...body,
        _id: 'mock-' + Date.now(),
        createdAt: new Date().toISOString(),
        avatar: body.email ? 
          `https://www.gravatar.com/avatar/${Buffer.from(body.email).toString('hex')}?d=identicon` : 
          null
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
