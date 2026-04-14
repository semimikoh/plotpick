"use client";

import { Paper, Text, Box } from "@mantine/core";
import { useState } from "react";
import Markdown from "react-markdown";
import type { ContentResult } from "@/core/types/search";
import { RecommendationCards } from "@/components/recommendation/RecommendationCards";
import { TypeWriter } from "@/components/chat/TypeWriter";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: ContentResult[];
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (item: ContentResult) => void;
  typing?: boolean;
};

function AssistantContent({
  content,
  typing,
  onTypingDone,
  showResultsGap,
}: {
  content: string;
  typing?: boolean;
  onTypingDone: () => void;
  showResultsGap: boolean;
}) {
  if (typing) {
    return (
      <Box mb={showResultsGap ? "sm" : 0}>
        <TypeWriter text={content} onComplete={onTypingDone} />
      </Box>
    );
  }

  return (
    <Box fz="sm" mb={showResultsGap ? "sm" : 0}>
      <Markdown>{content}</Markdown>
    </Box>
  );
}

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [typingDone, setTypingDone] = useState(!message.typing);

  const showResults = typingDone && message.results && message.results.length > 0;

  return (
    <Paper
      p="sm"
      radius="md"
      bg={isUser ? "blue.1" : "gray.0"}
      maw={isUser ? "80%" : "100%"}
      ml={isUser ? "auto" : undefined}
    >
      {message.content && isUser && (
        <Text size="sm">{message.content}</Text>
      )}
      {message.content && !isUser && (
        <AssistantContent
          content={message.content}
          typing={message.typing}
          onTypingDone={() => setTypingDone(true)}
          showResultsGap={!!showResults}
        />
      )}
      {showResults && (
        <RecommendationCards
          results={message.results!}
          onSelect={message.selectable ? message.onSelect : undefined}
          selectedId={message.selectedId}
        />
      )}
    </Paper>
  );
}
