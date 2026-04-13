"use client";

import { Stack, ScrollArea } from "@mantine/core";
import { useEffect, useRef } from "react";
import { Message, type ChatMessage } from "@/components/chat/Message";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewport.current?.scrollTo({
      top: viewport.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  return (
    <ScrollArea flex={1} viewportRef={viewport}>
      <Stack gap="sm" p="md">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
      </Stack>
    </ScrollArea>
  );
}
