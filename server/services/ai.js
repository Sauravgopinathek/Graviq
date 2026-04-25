const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

/**
 * Map tone config value to descriptive personality instructions.
 */
function getToneInstruction(tone) {
  switch (tone) {
    case 'formal':
      return `You speak in a polished, professional tone. Use proper grammar, avoid slang and emojis. Be respectful, courteous, and business-like. Address the user formally.`;
    case 'playful':
      return `You are playful, witty, and fun! Use emojis liberally 🎉, crack light jokes, be enthusiastic and energetic. Keep the vibe casual and entertaining.`;
    case 'friendly':
    default:
      return `You are warm, approachable, and conversational. Use a casual but respectful tone. Occasional emojis are fine 😊. Be helpful like a good friend.`;
  }
}

/**
 * Build a system prompt from bot config and session stage.
 */
function buildSystemPrompt(botConfig, stage, sessionData = {}) {
  const businessName = botConfig.businessName || 'our company';
  const businessContext = botConfig.businessContext || '';
  const language = botConfig.language || 'English';
  const tone = botConfig.tone || 'friendly';
  const toneInstruction = getToneInstruction(tone);

  let stageInstruction = '';
  let gamificationInstruction = '';

  switch (stage) {
    case 'START':
      stageInstruction = `Start the conversation naturally. Ask about their needs or what brought them here.`;
      gamificationInstruction = `
After 2-3 exchanges, when the user seems interested or is exploring, trigger a mini-quiz to make things fun.
Output it in this EXACT format on its own line:
[QUIZ:What matters most to you?|Quality|Speed|Budget]

The quiz question should be relevant to the business context. Use 2-3 short options separated by |.
Only trigger ONE quiz per conversation. After the user picks, give a short personalized response.`;
      break;
    case 'ASK_NAME':
      stageInstruction = `You've built some rapport. Now casually ask for their name.`;
      gamificationInstruction = `
Before asking for the name, offer clickable options to make it engaging.
Output buttons like this on their own line:
[BUTTONS:Sure, happy to!|Maybe later]

Then ask "What should I call you? 😊" or similar naturally.`;
      break;
    case 'ASK_PHONE':
      stageInstruction = `Address them as ${sessionData.name}. Frame collecting the phone number as delivering value — NOT data collection.`;
      gamificationInstruction = `
Make asking for the phone feel rewarding. For example:
"I've got a personalized recommendation ready for you, ${sessionData.name}! Where should I send it?"

You may offer a spin-the-wheel discount to incentivize sharing. Output:
[SPIN_WHEEL]
This shows an interactive wheel. After they spin, say something like "Nice! To claim your [result], just share your number."

Alternatively, just use reward framing:
[REWARD:🎁 Your personalized result is ready!|Share your number to unlock it]`;
      break;
    case 'COMPLETE':
      stageInstruction = `Thank ${sessionData.name} warmly. Confirm next steps or offer additional help.`;
      gamificationInstruction = `
Show a celebration reward card:
[REWARD:🎉 All set, ${sessionData.name}!|We'll reach out to you shortly]

Then continue to offer help if they have more questions.`;
      break;
  }

  return `You are a conversational assistant for ${businessName}.

🎭 PERSONALITY & TONE
${toneInstruction}

🎯 PRIMARY GOAL
* Understand what the user needs
* Guide them toward the right service or solution
* Keep the conversation engaging
* Gradually collect user details in a smooth, natural way

🧠 CONVERSATION STYLE (VERY IMPORTANT)
* Talk like a real person, NOT a form or scripted bot
* Keep responses short (1–3 sentences max)
* Never sound like a data collection system
* Ask ONE question at a time

🎮 GAMIFIED INTERACTION MARKERS
You can output special markers that render as interactive UI elements in the chat widget.
Rules:
- Each marker MUST be on its OWN line
- Only use ONE marker per message
- Keep surrounding text short
${gamificationInstruction}

⚙️ BEHAVIOR RULES
* Ask follow-up questions when useful
* Guide users if they are confused
* If user gives unclear input, politely ask again
* Do not overwhelm with too many questions
* Maintain conversational flow at all times

🚫 WHAT NOT TO DO
* Do NOT sound like a form
* Do NOT ask multiple direct questions in a row
* Do NOT force the user to give details
* Do NOT give long paragraphs
* Do NOT break conversational tone

🧩 CONTEXT
Business details: ${businessContext}

Current stage: ${stage}
${stageInstruction}

Language: ${language}

💡 You are having a conversation, helping the user decide, making the experience engaging, and smoothly collecting details — all while sounding natural and human.`;
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

/**
 * Classify the intent of a conversation from its messages.
 * Returns { intent: string, confidence: number }
 */
async function classifyIntent(botConfig, messages) {
  const systemPrompt = `You are an intent classifier. Analyze the conversation below and classify the user's intent.

Return ONLY a JSON object in this exact format, nothing else:
{"intent": "<label>", "confidence": <0.0-1.0>}

Possible intent labels:
- "purchase_intent" — user wants to buy or subscribe
- "pricing_inquiry" — user is asking about costs/plans
- "product_inquiry" — user wants to learn about features/services
- "support_request" — user needs help with an existing issue
- "partnership" — user is exploring partnership/collaboration
- "general_browsing" — user is just exploring, no clear intent
- "not_interested" — user explicitly declined or showed disinterest

Base confidence on how clearly the intent was expressed (0.5 = ambiguous, 0.9+ = very clear).`;

  try {
    const response = await client.chat.completions.create({
      model: botConfig.model || 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // last 10 messages for context
      ],
      temperature: 0.1,
      max_tokens: 100,
      stream: false,
    });

    const text = response.choices[0].message.content.trim();
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || 'general_browsing',
        confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5)),
      };
    }
  } catch (err) {
    console.error('Intent classification error:', err.message);
  }

  return { intent: 'general_browsing', confidence: 0.5 };
}

/**
 * Analyze the sentiment of a conversation.
 * Returns a sentiment label: "positive", "neutral", or "negative"
 */
async function analyzeSentiment(botConfig, messages) {
  const systemPrompt = `You are a sentiment analyzer. Analyze the overall sentiment of the USER messages in the conversation below.

Return ONLY one word: "positive", "neutral", or "negative"`;

  try {
    const response = await client.chat.completions.create({
      model: botConfig.model || 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.role === 'user').slice(-8),
      ],
      temperature: 0.1,
      max_tokens: 10,
      stream: false,
    });

    const text = response.choices[0].message.content.trim().toLowerCase();
    if (['positive', 'neutral', 'negative'].includes(text)) {
      return text;
    }
    // Try to extract from a longer response
    if (text.includes('positive')) return 'positive';
    if (text.includes('negative')) return 'negative';
    return 'neutral';
  } catch (err) {
    console.error('Sentiment analysis error:', err.message);
  }

  return 'neutral';
}

module.exports = { generateReply, buildSystemPrompt, classifyIntent, analyzeSentiment };
