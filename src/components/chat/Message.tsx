import { Paper, Text } from "@mantine/core";
import type { SearchResult } from "@/core/search/vector";

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
      maw="80%"
      ml={isUser ? "auto" : undefined}
    >
      {message.content && (
        <Text size="sm">{message.content}</Text>
      )}
      {message.results && message.results.length > 0 && (
        <>
          {message.results.map((r) => (
            <Paper key={r.id} p="xs" mt="xs" withBorder radius="sm">
              <Text size="sm" fw={600}>
                {r.title}
              </Text>
              <Text size="xs" c="dimmed">
                {r.platform} | {(r.similarity * 100).toFixed(1)}%
              </Text>
              <Text size="xs" mt={4} lineClamp={2}>
                {r.description}
              </Text>
            </Paper>
          ))}
        </>
      )}
    </Paper>
  );
}
