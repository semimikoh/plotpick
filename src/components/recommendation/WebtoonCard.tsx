import {
  Card,
  Text,
  Badge,
  Group,
  Anchor,
  Stack,
  Progress,
} from "@mantine/core";
import type { SearchResult } from "@/core/search/vector";

function similarityColor(score: number): string {
  if (score >= 0.8) return "green";
  if (score >= 0.5) return "blue";
  if (score >= 0.3) return "yellow";
  return "gray";
}

export function WebtoonCard({
  webtoon,
  onSelect,
  selected,
}: {
  webtoon: SearchResult;
  onSelect?: (webtoon: SearchResult) => void;
  selected?: boolean;
}) {
  const score = (webtoon.similarity * 100).toFixed(1);
  const color = similarityColor(webtoon.similarity);

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
      onClick={() => onSelect?.(webtoon)}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" fw={600} style={{ flex: 1 }}>
            {webtoon.title}
          </Text>
          <Badge size="xs" variant="light" color={color}>
            {score}%
          </Badge>
        </Group>

        <Progress
          value={webtoon.similarity * 100}
          color={color}
          size="xs"
          radius="xl"
        />

        <Group gap="xs">
          <Badge size="xs" variant="outline">
            {webtoon.platform}
          </Badge>
          {webtoon.genres.map((g) => (
            <Badge key={g} size="xs" variant="dot">
              {g}
            </Badge>
          ))}
        </Group>

        <Text size="xs" c="dimmed" lineClamp={3}>
          {webtoon.description}
        </Text>

        <Anchor
          href={webtoon.url}
          target="_blank"
          size="xs"
          onClick={(e) => e.stopPropagation()}
        >
          위키백과
        </Anchor>
      </Stack>
    </Card>
  );
}
