import {
  Card,
  Text,
  Badge,
  Group,
  Anchor,
  Stack,
  Progress,
} from "@mantine/core";
import type { ContentResult } from "@/core/types/search";

function similarityColor(score: number): string {
  if (score >= 0.8) return "green";
  if (score >= 0.5) return "blue";
  if (score >= 0.3) return "yellow";
  return "gray";
}

export function ContentCard({
  item,
  onSelect,
  selected,
}: {
  item: ContentResult;
  onSelect?: (item: ContentResult) => void;
  selected?: boolean;
}) {
  const score = (item.similarity * 100).toFixed(1);
  const color = similarityColor(item.similarity);

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      style={{
        cursor: onSelect ? "pointer" : undefined,
        borderColor: selected ? "var(--mantine-color-blue-5)" : undefined,
        borderWidth: selected ? 2 : undefined,
        opacity: selected === false ? 0.5 : 1,
      }}
      onClick={() => onSelect?.(item)}
      role={onSelect ? "button" : "article"}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={`${item.title} - 유사도 ${score}%`}
      aria-selected={selected}
      onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(item); } } : undefined}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" fw={600} style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Badge size="xs" variant="light" color={color}>
            {score}%
          </Badge>
        </Group>

        <Progress
          value={item.similarity * 100}
          color={color}
          size="xs"
          radius="xl"
          aria-label={`유사도 ${score}%`}
        />

        <Group gap="xs">
          {item.platform && (
            <Badge size="xs" variant="outline">
              {item.platform}
            </Badge>
          )}
          {item.genres.map((g) => (
            <Badge key={g} size="xs" variant="dot">
              {g}
            </Badge>
          ))}
        </Group>

        <Text size="xs" c="gray.6" lineClamp={3}>
          {item.description}
        </Text>

        {item.url.startsWith("http") && (
          <Anchor
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            onClick={(e) => e.stopPropagation()}
          >
            상세 정보
          </Anchor>
        )}
      </Stack>
    </Card>
  );
}
