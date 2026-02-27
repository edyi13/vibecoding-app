import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ParsedTask {
  cleanedTitle: string;
  estimatedMinutes: number;
  deadline: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export async function parseTaskWithAI(rawTitle: string): Promise<ParsedTask> {
  const today = new Date().toISOString().split("T")[0];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Parse this task and extract structured data. Today's date is ${today}.

Task: "${rawTitle}"

Return ONLY valid JSON with these fields:
- cleanedTitle: a clean, concise version of the task title (remove time/date references that are captured in other fields)
- estimatedMinutes: estimated time to complete in minutes (default 60 if not mentioned)
- deadline: ISO date string (YYYY-MM-DD) if a deadline is mentioned, otherwise null
- priority: "LOW", "MEDIUM", or "HIGH" based on urgency words (urgent/asap/important = HIGH, normal = MEDIUM, low priority/whenever = LOW)

Examples:
"Buy groceries tomorrow" -> {"cleanedTitle": "Buy groceries", "estimatedMinutes": 60, "deadline": "2026-02-27", "priority": "MEDIUM"}
"Urgent: finish report by Friday 2 hours" -> {"cleanedTitle": "Finish report", "estimatedMinutes": 120, "deadline": "2026-02-28", "priority": "HIGH"}
"Call mom" -> {"cleanedTitle": "Call mom", "estimatedMinutes": 60, "deadline": null, "priority": "MEDIUM"}

Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    const parsed = JSON.parse(content.text) as ParsedTask;

    // Validate and sanitize the response
    return {
      cleanedTitle: parsed.cleanedTitle || rawTitle,
      estimatedMinutes:
        typeof parsed.estimatedMinutes === "number" && parsed.estimatedMinutes > 0
          ? parsed.estimatedMinutes
          : 60,
      deadline: parsed.deadline || null,
      priority: ["LOW", "MEDIUM", "HIGH"].includes(parsed.priority)
        ? parsed.priority
        : "MEDIUM",
    };
  } catch {
    // If parsing fails, return defaults
    return {
      cleanedTitle: rawTitle,
      estimatedMinutes: 60,
      deadline: null,
      priority: "MEDIUM",
    };
  }
}
