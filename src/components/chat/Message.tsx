"use client";

import { Paper, Text, Box, Button, Group } from "@mantine/core";
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
  onSelect?: (webtoon: ContentResult) => void;
  typing?: boolean;
  genreOptions?: string[];
  onGenreSelect?: (genre: string | null) => void;
  selectedGenre?: string | null;
};

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
      {message.content && !isUser && message.typing && (
        <Box mb={showResults ? "sm" : 0}>
          <TypeWriter
            text={message.content}
            onComplete={() => setTypingDone(true)}
          />
        </Box>
      )}
      {message.content && !isUser && !message.typing && (
        <Box fz="sm" mb={showResults || message.genreOptions?.length ? "sm" : 0}>
          <Markdown>{message.content}</Markdown>
        </Box>
      )}
      {message.genreOptions && message.onGenreSelect && (
        <Group gap="xs" wrap="wrap">
          {message.genreOptions.map((genre) => (
            <Button
              key={genre}
              size="xs"
              variant={message.selectedGenre === genre ? "filled" : "light"}
              onClick={() => message.onGenreSelect?.(genre)}
              disabled={message.selectedGenre !== undefined && message.selectedGenre !== genre}
            >
              {genre}
            </Button>
          ))}
          <Button
            size="xs"
            variant={message.selectedGenre === null && message.selectedGenre !== undefined ? "filled" : "light"}
            color="gray"
            onClick={() => message.onGenreSelect?.(null)}
            disabled={message.selectedGenre !== undefined && message.selectedGenre !== null}
          >
            모르겠다
          </Button>
        </Group>
      )}
      {message.genreOptions && !message.onGenreSelect && message.selectedGenre !== undefined && (
        <Group gap="xs" wrap="wrap">
          <Button size="xs" variant="filled" disabled>
            {message.selectedGenre ?? "모르겠다"}
          </Button>
        </Group>
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
