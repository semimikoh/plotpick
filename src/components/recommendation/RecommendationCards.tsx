import { SimpleGrid } from "@mantine/core";
import type { ContentResult } from "@/core/types/search";
import { WebtoonCard } from "@/components/recommendation/WebtoonCard";

export function RecommendationCards({
  results,
  onSelect,
  selectedId,
}: {
  results: ContentResult[];
  onSelect?: (webtoon: ContentResult) => void;
  selectedId?: string | null;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {results.map((r) => (
        <WebtoonCard
          key={r.id}
          webtoon={r}
          onSelect={onSelect}
          selected={selectedId ? r.id === selectedId : undefined}
        />
      ))}
    </SimpleGrid>
  );
}
