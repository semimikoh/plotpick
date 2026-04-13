import { Paper, Text, Box } from "@mantine/core";
import Markdown from "react-markdown";
import type { SearchResult } from "@/core/search/vector";
import { RecommendationCards } from "@/components/recommendation/RecommendationCards";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: SearchResult[];
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (webtoon: SearchResult) => void;
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
      {message.content && isUser && (
        <Text size="sm">{message.content}</Text>
      )}
      {message.content && !isUser && (
        <Box fz="sm" mb={message.results?.length ? "sm" : 0}>
          <Markdown>{message.content}</Markdown>
        </Box>
      )}
      {message.results && message.results.length > 0 && (
        <RecommendationCards
          results={message.results}
          onSelect={message.selectable ? message.onSelect : undefined}
          selectedId={message.selectedId}
        />
      )}
    </Paper>
  );
}
