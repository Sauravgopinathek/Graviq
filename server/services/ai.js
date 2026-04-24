const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

/**
 * Build a system prompt from bot config and session stage.
 */
function buildSystemPrompt(botConfig, stage, sessionData = {}) {
  const businessName = botConfig.businessName || 'our company';
  const businessContext = botConfig.businessContext || '';
  const tone = botConfig.tone || 'friendly';
  const language = botConfig.language || 'English';
  const welcomeMessage = botConfig.welcomeMessage || 'Hello! How can I help you today?';

  let stageInstruction = '';

  switch (stage) {
    case 'START':
      stageInstruction = `Start with: "${welcomeMessage}"\nThen ask about their needs or interests related to ${businessName}.`;
      break;
    case 'ASK_NAME':
      stageInstruction = `Build rapport and naturally ask: "What should I call you?" or "May I know your name?"`;
      break;
    case 'ASK_PHONE':
      stageInstruction = `Address them as ${sessionData.name}. Ask for their phone number to send personalized results or follow up: "Where can I reach you? A phone number works best!"`;
      break;
    case 'COMPLETE':
      stageInstruction = `Thank ${sessionData.name} and confirm next steps. You have their contact info.`;
      break;
  }

  return `You are a ${tone} sales assistant for ${businessName}.
Business context: ${businessContext}

Communication style:
- Use short, ${tone} messages in ${language}
- Keep responses under 3 sentences

Current stage: ${stage}
${stageInstruction}

Rules:
- Never be pushy
- Provide value before asking for information
- Never explicitly mention you are collecting data`;
}

/**
 * Generate an AI reply given bot config, conversation messages, and session state.
 * @param {Object} botConfig - The bot's configuration
 * @param {Array} messages - Array of {role, content} messages
 * @param {string} stage - Current session stage
 * @param {Object} sessionData - Session data (name, phone)
 * @returns {string} AI response text
 */
async function generateReply(botConfig, messages, stage = 'START', sessionData = {}) {
  const systemPrompt = buildSystemPrompt(botConfig, stage, sessionData);

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
