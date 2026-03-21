const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function findMatches(
  newItem: {
    title: string;
    description: string;
    category: string;
    location: string;
    type: string;
  },
  existingItems: any[]
): Promise<number[]> {
  const prompt = `You are a lost and found matching assistant.
A new item has been posted:
Title: ${newItem.title}
Description: ${newItem.description}
Category: ${newItem.category}
Location: ${newItem.location}
Type: ${newItem.type}

Existing posts of opposite type:
${existingItems.map((item, i) => `${i}. Title: ${item.title}, Description: ${item.description}, Category: ${item.category}, Location: ${item.location}`).join("\n")}

Return ONLY a JSON array of indices of likely matches. Example: [0, 2]
If no matches return: []
Be strict, only high confidence matches.`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    }
  );

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "[]";
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return [];
  }
}
