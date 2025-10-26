import { AIChatAgent } from "agents/ai-chat-agent";
import { streamText, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createWorkersAI } from "workers-ai-provider";

export class TravelPlannerAgent extends AIChatAgent {
  async onChatMessage(onFinish, options) {
    console.log("onChatMessage called with options:", options ? "present" : "missing");  // Debug: Check context
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          console.log("AI binding available:", !!options.env?.AI);  // Debug: Binding check
          const workersai = createWorkersAI({ binding: options.env?.AI });
          if (!workersai) {
            throw new Error("Failed to initialize Workers AI provider");
          }

          console.log("Streaming with model: @cf/meta/llama-3.1-8b-instruct-fast");  // Confirmed ID
          const result = await streamText({
            system: `You are a friendly travel planner. Respond conversationally with itineraries, tips, hotel/flight suggestions, and destination facts. Keep it engaging and concise.`,
            messages: this.messages,
            model: workersai("@cf/meta/llama-3.1-8b-instruct-fast"),  // Fast variant: Valid & optimized for chat (per docs)
            onFinish,
          });

          console.log("Stream created successfully");  // Debug: If reached, merging stream
          writer.merge(result.toUIMessageStream());
        } catch (error) {
          console.error("AI Stream Error:", error.message || error);  // Full error to tail
          writer.write({ type: "text", text: "Sorry, I hit a snag planning your adventure. Try again!" });
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  // Suppress onRequest warning
  async fetch(request, env, ctx) {
    return super.fetch(request, env, ctx);
  }
}