Travel Planner Agent

A simple AI chat app for travel planning, built with Cloudflare Workers. Ask for itineraries (e.g., "Plan a weekend in Tokyo"), and it streams responses using Llama 3.1 AI.
Live Demo: travel-planner-simple.elinorcsy.workers.dev

Features

Real-time chat with AI-generated travel tips and plans.
Persistent conversation history.
Edge-deployed for fast global access.

Tech

Cloudflare Agents & Workers AI (Llama 3.1).
Vanilla JS frontend.

Setup

Clone: git clone https://github.com/YOUR_USERNAME/travel-planner-agent.git && cd travel-planner-agent
Install: npm install
Dev: npx wrangler dev --remote (open http://localhost:8787)
Deploy: npx wrangler deploy

Usage
Load the app, type a query, and send. Responses stream live.

Structure

public/: HTML/JS UI.
src/: Worker & agent code.
wrangler.jsonc: Config.
