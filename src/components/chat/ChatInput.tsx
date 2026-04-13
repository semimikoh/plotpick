"use client";

import { TextInput, ActionIcon, Group } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";

export function ChatInput({
  onSubmit,
  loading,
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <Group gap="xs">
      <TextInput
        flex={1}
        placeholder="어떤 웹툰을 찾고 있나요?"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        disabled={loading}
        autoFocus
      />
      <ActionIcon
        size="lg"
        variant="filled"
        onClick={handleSubmit}
        loading={loading}
        aria-label="검색"
      >
        <IconSearch size={18} />
      </ActionIcon>
    </Group>
  );
}
