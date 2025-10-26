const chatContainer = document.getElementById("chat-container");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

let controller = null;

function addMessage(role, text = "") {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.textContent = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addMessage("user", text);
  input.value = "";

  if (controller) controller.abort();
  controller = new AbortController();

  addMessage("assistant", "");
  const streamTarget = chatContainer.lastChild;

  try {
    const response = await fetch("/agents/travel-planner-agent/default/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE Parser: Split events, extract content deltas
      const events = buffer.split("\n\n");
      for (let i = 0; i < events.length - 1; i++) {
        const event = events[i].trim();
        if (event.startsWith("data: ") && event !== "data: [DONE]") {
          try {
            const data = JSON.parse(event.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              streamTarget.textContent += data.choices[0].delta.content;
            }
          } catch (e) {
            console.warn("SSE Parse Error:", e);
          }
        }
      }
      buffer = events[events.length - 1]; // Carry incomplete event
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Stream Error:", err);
      streamTarget.textContent = "⚠️ Oops—couldn't fetch your travel plan. Try again!";
    }
  }
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});