import { Card, Text, Badge, Group, Anchor, Stack } from "@mantine/core";
import type { SearchResult } from "@/core/search/vector";

export function WebtoonCard({ webtoon }: { webtoon: SearchResult }) {
  const score = (webtoon.similarity * 100).toFixed(1);

  return (
    <Card withBorder radius="md" p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" fw={600} style={{ flex: 1 }}>
            {webtoon.title}
          </Text>
          <Badge size="xs" variant="light" color="blue">
            {score}%
          </Badge>
        </Group>

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

        <Anchor href={webtoon.url} target="_blank" size="xs">
          위키백과
        </Anchor>
      </Stack>
    </Card>
  );
}
