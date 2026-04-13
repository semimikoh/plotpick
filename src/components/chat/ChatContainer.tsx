"use client";

import { Stack, Title, Text } from "@mantine/core";
import { useState, useCallback } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatMessage } from "@/components/chat/Message";

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (query: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, count: 5 }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          data.results?.length > 0
            ? `"${query}"에 대해 ${data.results.length}개의 웹툰을 찾았습니다.`
            : "검색 결과가 없습니다.",
        results: data.results ?? [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Stack h="100vh" gap={0}>
      <Stack align="center" p="md" gap={4}>
        <Title order={3}>PlotPick</Title>
        <Text size="sm" c="dimmed">
          기억나는 장면이나 느낌을 말해보세요
        </Text>
      </Stack>
      <MessageList messages={messages} />
      <Stack p="md">
        <ChatInput onSubmit={handleSubmit} loading={loading} />
      </Stack>
    </Stack>
  );
}
