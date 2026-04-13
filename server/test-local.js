const http = require('http');

async function debugServer() {
  try {
    // 1. Create a bot using a mock DB or rely on the user's existing bot
    // Or just hit the API to get the first bot
    const fetch = (await import('node-fetch')).default;
    const botId = 'fa889c7c-6230-4ce5-9d44-4229280d7aeb';

    console.log('Creating conversation for bot:', botId);
    const convRes = await fetch('http://127.0.0.1:3000/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, sourceUrl: 'http://127.0.0.1:3000/test' })
    });
    
    if (!convRes.ok) {
        console.error('Failed to create conv:', await convRes.text());
        return;
    }
    
    const convData = await convRes.json();
    console.log('Conversation created:', convData.conversation.id);
    
    console.log('Sending message to conversation...');
    const msgRes = await fetch(`http://localhost:3000/api/conversations/${convData.conversation.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hi' })
    });
    
    if (!msgRes.ok) {
        console.error('SERVER ERROR RESPONSE:');
        console.error(msgRes.status, await msgRes.text());
        return;
    }
    
    console.log('SUCCESS! Reply:', await msgRes.json());
    
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
debugServer();
