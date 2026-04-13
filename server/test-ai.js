require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const OpenAI = require('openai');

async function testConnection() {
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  const fullMessages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'assistant', content: 'Hello! How can I help you today?' },
    { role: 'user', content: 'hi' },
  ];

  try {
    const response = await client.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 50,
      stream: false,
    });
    
    console.log('âœ… SUCCESS!');
  } catch (err) {
    console.error('âŒ FAILED:', err.status, err.message);
    if (err.error) console.error(err.error);
  }
}

testConnection();
