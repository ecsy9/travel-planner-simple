import { routeAgentRequest } from "agents";
import { TravelPlannerAgent } from "./travelPlannerAgent.js";

export { TravelPlannerAgent }; // Registers the agent class

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve static assets (frontend)
    if (url.pathname.startsWith("/app.js") || url.pathname === "/") {
      return env.ASSETS.fetch(request);
    }

    // Route to agent (e.g., /agents/travel-planner-agent/{instance}/chat)
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    return new Response("Not Found", { status: 404 });
  },
};