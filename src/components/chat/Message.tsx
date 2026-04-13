import { Paper, Text } from "@mantine/core";
import type { SearchResult } from "@/core/search/vector";
import { RecommendationCards } from "@/components/recommendation/RecommendationCards";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: SearchResult[];
};

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <Paper
      p="sm"
      radius="md"
      bg={isUser ? "blue.1" : "gray.0"}
      maw={isUser ? "80%" : "100%"}
      ml={isUser ? "auto" : undefined}
    >
      {message.content && (
        <Text size="sm" mb={message.results?.length ? "sm" : 0}>
          {message.content}
        </Text>
      )}
      {message.results && message.results.length > 0 && (
        <RecommendationCards results={message.results} />
      )}
    </Paper>
  );
}
