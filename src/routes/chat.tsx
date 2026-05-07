import { createFileRoute } from "@tanstack/react-router";
import { ChatLayout } from "@/components/chat/ChatLayout";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Aura" },
      { name: "description", content: "Your AI-powered chat experience." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return <ChatLayout />;
}
