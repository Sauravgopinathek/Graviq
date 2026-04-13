const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

/**
 * Build a system prompt from bot config.
 */
function buildSystemPrompt(botConfig) {
  const businessName = botConfig.businessName || 'our company';
  const businessContext = botConfig.businessContext || '';
  const tone = botConfig.tone || 'friendly';
  const language = botConfig.language || 'English';
  const welcomeMessage = botConfig.welcomeMessage || 'Hello! How can I help you today?';

  return `You are a ${tone} sales assistant for ${businessName}.
Your goal is to help the visitor and naturally collect their name and phone number.
Never ask directly for phone number at the start. Build rapport first.

Business context: ${businessContext}

Communication style:
- Use short, ${tone} messages
- Speak in ${language}
- Keep responses under 3 sentences when possible

Conversation flow:
1. GREETING: Start with a warm welcome. Use something like: "${welcomeMessage}"
2. PROBLEM DISCOVERY: Ask about their needs or pain points
3. VALUE OFFERING: Share relevant solutions based on business context
4. GAMIFIED ENGAGEMENT: Use a mini-quiz or personalized recommendation
5. LEAD CAPTURE: Frame contact collection as result delivery:
   - "Want to see a personalized result?"
   - "What should I call you?" (capture name)
   - "Where can I send your result? A phone number works best!" (capture phone)
6. CONFIRMATION: Thank them and confirm next steps

Rules:
- Never be pushy about collecting information
- If the user resists sharing info, continue the conversation naturally and try again later
- Always provide value before asking for contact details
- When you detect the user has shared their name, acknowledge it naturally
- When you detect the user has shared a phone number, confirm it and wrap up
- Never explicitly say you are collecting leads or data`;
}

/**
 * Generate an AI reply given bot config and conversation messages.
 * @param {Object} botConfig - The bot's configuration
 * @param {Array} messages - Array of {role, content} messages
 * @returns {string} AI response text
 */
async function generateReply(botConfig, messages) {
  const systemPrompt = buildSystemPrompt(botConfig);

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await client.chat.completions.create({
      model: botConfig.model || 'meta/llama-3.1-70b-instruct',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error('NVIDIA AI error:', err.message);
    throw new Error('Failed to generate AI response');
  }
}

module.exports = { generateReply, buildSystemPrompt };
