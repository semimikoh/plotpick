import { SimpleGrid } from "@mantine/core";
import type { ContentResult } from "@/core/types/search";
import { ContentCard } from "@/components/recommendation/ContentCard";

export function RecommendationCards({
  results,
  onSelect,
  selectedId,
}: {
  results: ContentResult[];
  onSelect?: (item: ContentResult) => void;
  selectedId?: string | null;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {results.map((r) => (
        <ContentCard
          key={r.id}
          item={r}
          onSelect={onSelect}
          selected={selectedId ? r.id === selectedId : undefined}
        />
      ))}
    </SimpleGrid>
  );
}
