import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Aurix" },
      { name: "description", content: "Your Aurix conversations" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-neon mx-auto mb-3 animate-pulse-neon" />
          <p className="text-sm text-muted-foreground">Loading Aurix...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <ChatLayout />;
}
