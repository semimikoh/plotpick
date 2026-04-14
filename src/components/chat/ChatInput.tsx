"use client";

import { TextInput, ActionIcon, Group } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, useRef, useCallback, memo } from "react";

const SubmitButton = memo(function SubmitButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <ActionIcon
      size="lg"
      variant="filled"
      onClick={onClick}
      loading={loading}
      aria-label="검색"
    >
      <IconSearch size={18} />
    </ActionIcon>
  );
});

export function ChatInput({
  onSubmit,
  loading,
  placeholder = "어떤 작품을 찾고 있나요?",
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const valueRef = useRef(value);
  valueRef.current = value;

  const handleSubmit = useCallback(() => {
    const trimmed = valueRef.current.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue("");
  }, [onSubmit, loading]);

  return (
    <Group gap="xs">
      <TextInput
        flex={1}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        disabled={loading}
        autoFocus
      />
      <SubmitButton onClick={handleSubmit} loading={loading} />
    </Group>
  );
}
