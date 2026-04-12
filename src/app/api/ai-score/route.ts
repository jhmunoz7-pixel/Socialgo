/**
 * AI Content Scoring API Route
 * Analyzes social media posts using Claude Haiku and returns an AI score (0-100) plus insights
 * POST /api/ai-score
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Post } from "@/types";

interface AiScoreRequest {
  post_id: string;
  copy: string;
  objective: string;
  post_type: string;
  platform: string;
  client_name: string;
}

interface ClaudeMessage {
  content: Array<{
    type: string;
    text: string;
  }>;
}

interface AiScoreResponse {
  score: number;
  insights: string[];
}

/**
 * Calls Claude Haiku API to score the post and generate insights
 */
async function scorePostWithClaude(
  copy: string,
  objective: string,
  postType: string,
  platform: string,
  clientName: string
): Promise<AiScoreResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const prompt = `You are an expert social media strategist analyzing a post for a client.

Client Name: ${clientName}
Platform: ${platform}
Post Type: ${postType}
Campaign Objective: ${objective}

Post Copy:
"${copy}"

Please analyze this post and provide:
1. An AI score from 0-100 based on:
   - Relevance to the campaign objective
   - Emotional hook and engagement potential
   - Clarity and readability
   - Call-to-action presence and effectiveness
   - Platform-specific best practices fit

2. 3-5 specific, actionable insights in Spanish to improve the post

Respond ONLY with valid JSON in this exact format:
{
  "score": <number between 0 and 100>,
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = (await response.json()) as ClaudeMessage;

    // Extract the text content from Claude's response
    const textContent = data.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    // Parse the JSON response from Claude
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const result = JSON.parse(jsonMatch[0]) as AiScoreResponse;

    // Validate the response structure
    if (typeof result.score !== "number" || !Array.isArray(result.insights)) {
      throw new Error("Invalid response format from Claude");
    }

    // Ensure score is within bounds
    result.score = Math.max(0, Math.min(100, result.score));

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error calling Claude API";
    throw new Error(`Failed to score post with Claude: ${errorMessage}`);
  }
}

/**
 * POST handler - receives post data and returns AI score and insights
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - user not authenticated" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as AiScoreRequest;
    const { post_id, copy, objective, post_type, platform, client_name } = body;

    // Validate required fields
    if (!post_id || !copy || !objective || !post_type || !platform || !client_name) {
      return NextResponse.json(
        {
          error: "Missing required fields: post_id, copy, objective, post_type, platform, client_name",
        },
        { status: 400 }
      );
    }

    // Validate copy length (not too short or too long)
    if (copy.trim().length < 10) {
      return NextResponse.json(
        { error: "Post copy must be at least 10 characters long" },
        { status: 400 }
      );
    }

    if (copy.trim().length > 3000) {
      return NextResponse.json(
        { error: "Post copy must not exceed 3000 characters" },
        { status: 400 }
      );
    }

    // Call Claude to score the post
    const scoreResult = await scorePostWithClaude(
      copy,
      objective,
      post_type,
      platform,
      client_name
    );

    // Update the post in Supabase with the AI score and insights
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        ai_score: scoreResult.score,
        ai_insights: scoreResult.insights,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post_id)
      .eq("org_id", (await supabase.auth.getUser()).data.user?.user_metadata?.org_id);

    if (updateError) {
      console.error("Error updating post in Supabase:", updateError);
      return NextResponse.json(
        { error: `Failed to save AI score to database: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Return the score and insights
    return NextResponse.json({
      success: true,
      data: {
        post_id,
        score: scoreResult.score,
        insights: scoreResult.insights,
      },
    });
  } catch (error) {
    console.error("AI score route error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: `Failed to generate AI score: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns method not allowed
 */
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
