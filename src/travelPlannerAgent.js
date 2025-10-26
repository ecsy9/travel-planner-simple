import { AIChatAgent } from "agents/ai-chat-agent";
import { streamText, convertToModelMessages } from "ai";  // Add convertToModelMessages
import { createWorkersAI } from "workers-ai-provider";

export class TravelPlannerAgent extends AIChatAgent {
  // Core chat logic (generates/streams AI response)
  async onChatMessage(onFinish) {
    try {
      const workersai = createWorkersAI({ binding: this.env.AI });
      if (!workersai) throw new Error("AI binding unavailable");

      // Convert UI messages to model format for streamText
      const modelMessages = convertToModelMessages(this.messages);

      const result = await streamText({
        system: `You are a friendly travel assistant. Provide itineraries, travel tips, hotel or flight suggestions, and destination insights in a conversational tone.`,
        messages: modelMessages,  // Use converted messages
        model: workersai("@cf/meta/llama-3.1-8b-instruct-fast"),
        onFinish,
      });

      // Convert to ReadableStream for SSE Response (matches app.js parser)
      const stream = new ReadableStream({
        async start(controller) {
          const reader = result.textStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: value } }] })}\n\n`));
            }
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          } finally {
            reader.releaseLock();
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch (error) {
      console.error("onChatMessage error:", error);
      return new Response("Error generating response", { status: 500 });
    }
  }

  // Handle HTTP POSTs (parses body, appends message, streams AI response)
  async onRequest(request) {
    if (request.method === "POST") {
      try {
        const body = await request.json();
        let userMessage;

        // Handle Vercel AI format: { messages: [{ role: "user", content: "..." }] }
        if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
          const lastMsg = body.messages[body.messages.length - 1];
          if (lastMsg.role === "user") {
            userMessage = lastMsg.content;
          }
        } 
        // Fallback for simple { message: "..." }
        else if (body.message) {
          userMessage = body.message;
        }

        if (!userMessage) return new Response("Missing user message in body", { status: 400 });

        // Append user message to history (persists automatically)
        this.messages.push({ role: "user", content: userMessage });
        await this.saveMessages(this.messages);

        console.log("Chat message appended:", userMessage);  // Debug in logs

        // Generate and stream response
        const response = await this.onChatMessage(() => {});  // Empty onFinish for no tools
        return response;
      } catch (error) {
        console.error("onRequest error:", error);
        return new Response("Bad request", { status: 400 });
      }
    }

    return new Response("Only POST supported", { status: 405 });
  }

  async executeTask(description) {
    // Optional task method (unchanged)
    await this.saveMessages([
      ...this.messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: `Running scheduled travel task: ${description}` }],
        metadata: { createdAt: new Date() },
      },
    ]);
  }
}