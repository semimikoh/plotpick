"use client";

import { Stack, Title, Text, Center, Loader, Container, Paper } from "@mantine/core";
import { useState, useCallback } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { GenreFilter } from "@/components/chat/GenreFilter";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatMessage } from "@/components/chat/Message";

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);

  const handleSubmit = useCallback(
    async (query: string) => {
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
          body: JSON.stringify({
            query,
            count: 5,
            genres: genres.length > 0 ? genres : undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            data.results?.length > 0
              ? `"${query}"에 대해 ${data.results.length}개의 웹툰을 찾았습니다.`
              : `"${query}"에 대한 검색 결과가 없습니다. 다른 키워드로 시도해보세요.`,
          results: data.results ?? [],
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error("[search]", err);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [genres],
  );

  return (
    <Container size="sm" h="100vh" px={{ base: "xs", sm: "md" }}>
      <Stack h="100%" gap={0}>
        <Stack align="center" py="md" gap={4}>
          <Title order={3}>PlotPick</Title>
          <Text size="sm" c="dimmed">
            기억나는 장면이나 느낌을 말해보세요
          </Text>
        </Stack>

        {messages.length === 0 && !loading && (
          <Center flex={1}>
            <Stack align="center" gap="xs">
              <Text size="lg" c="dimmed">
                검색 예시
              </Text>
              <Text size="sm" c="dimmed">&quot;힐링되는 일상물&quot;</Text>
              <Text size="sm" c="dimmed">&quot;무서운 공포 웹툰&quot;</Text>
              <Text size="sm" c="dimmed">&quot;학교 배경 로맨스&quot;</Text>
            </Stack>
          </Center>
        )}

        {messages.length > 0 && <MessageList messages={messages} />}

        {loading && (
          <Center p="sm">
            <Loader size="sm" />
          </Center>
        )}

        <Paper py="md">
          <Stack gap="xs">
            <GenreFilter value={genres} onChange={setGenres} />
            <ChatInput onSubmit={handleSubmit} loading={loading} />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
