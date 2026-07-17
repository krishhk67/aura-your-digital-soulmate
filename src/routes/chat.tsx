import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { AurixLoader } from "@/components/chat/AurixLoader";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";

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

  return (
    <>
      <AnimatePresence>{loading && <AurixLoader key="loader" />}</AnimatePresence>
      {!loading && user ? <ChatLayout /> : null}
    </>
  );
}

