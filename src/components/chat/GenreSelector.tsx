"use client";

import { Center, Stack, Text, Group, Button } from "@mantine/core";
import { useState, useCallback, memo } from "react";

export const GenreSelector = memo(function GenreSelector({
  genres,
  onConfirm,
}: {
  genres: string[];
  onConfirm: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleClick = useCallback((genre: string) => {
    setSelected((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre],
    );
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selected);
  }, [selected, onConfirm]);

  return (
    <Center flex={1}>
      <Stack align="center" gap="lg" maw={400}>
        <Stack align="center" gap={4}>
          <Text size="lg" fw={600}>장르를 먼저 선택해 주세요</Text>
          <Text size="sm" c="dimmed">
            기억이 안 나면 "모르겠다"를 선택해도 됩니다
          </Text>
        </Stack>
        <Group justify="center" gap="sm" wrap="wrap" role="group" aria-label="장르 선택">
          {genres.map((genre) => (
            <Button
              key={genre}
              size="md"
              variant={selected.includes(genre) ? "filled" : "light"}
              onClick={() => handleClick(genre)}
              aria-pressed={selected.includes(genre)}
            >
              {genre}
            </Button>
          ))}
        </Group>
        <Group justify="center" gap="sm">
          <Button
            size="md"
            variant="light"
            color="gray"
            onClick={() => onConfirm([])}
          >
            모르겠다
          </Button>
          {selected.length > 0 && (
            <Button size="md" onClick={handleConfirm}>
              선택 완료
            </Button>
          )}
        </Group>
      </Stack>
    </Center>
  );
});
