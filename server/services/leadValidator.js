/**
 * Validate a lead name.
 * - At least 2 characters
 * - Only letters, spaces, hyphens, and apostrophes
 */
function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  return /^[a-zA-Z\s'\-]+$/.test(trimmed);
}

/**
 * Validate a phone number with country-aware patterns.
 * Supports: India (+91), US/Canada (+1), UK (+44), and generic international.
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  const patterns = [
    /^\+91[6-9]\d{9}$/,         // India
    /^[6-9]\d{9}$/,              // India (without country code)
    /^\+1\d{10}$/,               // US/Canada
    /^\d{10}$/,                  // US/Canada (without country code)
    /^\+44\d{10,11}$/,           // UK
    /^\+\d{7,15}$/,              // Generic international
  ];

  return patterns.some((p) => p.test(cleaned));
}

/**
 * Extract lead info (name, phone, email) from conversation messages.
 * Uses simple heuristic pattern matching on user messages.
 */
function extractLeadInfo(messages) {
  const lead = { name: null, phone: null, email: null };

  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);

  for (const msg of userMessages) {
    // Try to extract phone
    if (!lead.phone) {
      const phoneMatch = msg.match(/(?:\+?\d[\d\s\-\(\)\.]{6,15}\d)/);
      if (phoneMatch && validatePhone(phoneMatch[0])) {
        lead.phone = phoneMatch[0].replace(/[\s\-\(\)\.]/g, '');
      }
    }

    // Try to extract email
    if (!lead.email) {
      const emailMatch = msg.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        lead.email = emailMatch[0];
      }
    }

    // Try to extract name — short messages that look like a name (1-3 words, all alpha)
    if (!lead.name) {
      const trimmed = msg.trim();
      if (trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z\s'\-]+$/.test(trimmed)) {
        const words = trimmed.split(/\s+/);
        if (words.length <= 3) {
          lead.name = trimmed;
        }
      }
    }
  }

  return lead;
}

module.exports = { validateName, validatePhone, extractLeadInfo };
