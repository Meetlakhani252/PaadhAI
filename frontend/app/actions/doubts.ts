"use server";

import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

export interface GroundingSource {
  title: string;
  url: string;
}

export interface DoubtItem {
  id: string;
  subject_id: string;
  user_id: string;
  question_text: string;
  image_url: string | null;
  answer_text: string | null;
  created_at: string;
  sources?: GroundingSource[];
  web_search_used?: boolean;
}

const DAILY_LIMIT = 25;

export async function getDoubtsBySubject(subjectId: string): Promise<DoubtItem[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const rows = await sql`
    SELECT id, subject_id, user_id, question_text, image_url, answer_text, created_at
    FROM doubts
    WHERE subject_id = ${subjectId} AND user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return rows.map((r: any) => {
    let parsedSources: GroundingSource[] = [];
    let webUsed = false;
    let cleanAnswer = r.answer_text || "";

    // Parse grounded sources if tagged in answer_text
    if (cleanAnswer.includes("\n<!-- RAG_SOURCES:")) {
      try {
        const parts = cleanAnswer.split("\n<!-- RAG_SOURCES:");
        cleanAnswer = parts[0];
        const jsonStr = parts[1].replace("-->", "").trim();
        parsedSources = JSON.parse(jsonStr);
        webUsed = parsedSources.length > 0;
      } catch {
        // ignore parse error
      }
    }

    return {
      ...r,
      answer_text: cleanAnswer,
      sources: parsedSources,
      web_search_used: webUsed,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
  }) as DoubtItem[];
}

export async function getUserDailyDoubtUsage(): Promise<{ used: number; limit: number }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const countResult = await sql`
    SELECT count(*)::int as count
    FROM doubts
    WHERE user_id = ${userId} AND created_at >= CURRENT_DATE
  `;

  const used = Number(countResult[0]?.count || 0);
  return { used, limit: DAILY_LIMIT };
}

export async function createAndSolveDoubt(data: {
  subjectId: string;
  questionText: string;
  imageBase64?: string;
  mimeType?: string;
  enableWebSearch?: boolean;
}): Promise<DoubtItem> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { used, limit } = await getUserDailyDoubtUsage();
  if (used >= limit) {
    throw new Error(`Daily AI limit reached (${limit}/${limit} doubts). Please try again tomorrow.`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const parts: any[] = [];
  if (data.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: data.mimeType || "image/jpeg",
        data: data.imageBase64,
      },
    });
  }

  const userQuery = data.questionText.trim()
    ? data.questionText
    : "Please solve and explain the question or concept shown in the image step-by-step.";

  parts.push({ text: userQuery });

  const systemInstruction = `You are an expert college tutor and academic researcher on PaadhAI.
When solving this student's doubt:
1. Explain the underlying conceptual foundation clearly and thoroughly.
2. If the user asks about contemporary topics, latest tools, documentation, or current exam trends, synthesize verified real-time information from Google Search.
3. For mathematical, technical, or programming problems, provide a rigorous step-by-step solution or derivation with clear code blocks.
4. Highlight key formulas, definitions, and high-frequency exam principles.
5. Conclude with a concise 'Key Takeaway' summary.
Format equations, lists, and code clearly using clean markdown.`;

  const useSearch = data.enableWebSearch !== false;
  const payload: any = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [{ parts }],
  };

  if (useSearch) {
    payload.tools = [{ google_search: {} }];
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  // Fallback if model or tool triggers rejection
  if (!response.ok && useSearch) {
    delete payload.tools;
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", errText);
    throw new Error("Failed to get solution from AI. Please try again.");
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];
  const answerText =
    candidate?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join("\n") || "No explanation could be generated.";

  // Extract Google Grounding Sources (RAG Citations)
  const sources: GroundingSource[] = [];
  const groundingMeta = candidate?.grounding_metadata || candidate?.groundingMetadata || {};
  const chunks = groundingMeta.grounding_chunks || groundingMeta.groundingChunks || [];

  for (const chunk of chunks) {
    const web = chunk.web || {};
    const uri = web.uri || web.url;
    const title = web.title || uri;
    if (uri && title) {
      sources.push({ title, url: uri });
    }
  }

  // De-duplicate sources
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.url, s])).values());
  const webSearchUsed = uniqueSources.length > 0;

  // Append serializable metadata tag into DB row for seamless recovery
  let dbStoredAnswer = answerText;
  if (uniqueSources.length > 0) {
    dbStoredAnswer += `\n<!-- RAG_SOURCES:${JSON.stringify(uniqueSources)} -->`;
  }

  const storedImageUrl = data.imageBase64
    ? `data:${data.mimeType || "image/jpeg"};base64,${data.imageBase64}`
    : null;

  const rows = await sql`
    INSERT INTO doubts (subject_id, user_id, question_text, image_url, answer_text)
    VALUES (${data.subjectId}, ${userId}, ${userQuery}, ${storedImageUrl}, ${dbStoredAnswer})
    RETURNING id, subject_id, user_id, question_text, image_url, answer_text, created_at
  `;

  const r = rows[0] as any;
  return {
    ...r,
    answer_text: answerText,
    sources: uniqueSources,
    web_search_used: webSearchUsed,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  } as DoubtItem;
}

export async function deleteDoubt(doubtId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await sql`
    DELETE FROM doubts
    WHERE id = ${doubtId} AND user_id = ${userId}
  `;
}
