"use client";

import { MultiSelect } from "@mantine/core";

const GENRE_OPTIONS = [
  { value: "코미디 웹 만화", label: "코미디" },
  { value: "코미디 만화", label: "코미디 (일반)" },
  { value: "액션 만화", label: "액션" },
  { value: "로맨스 웹 만화", label: "로맨스" },
  { value: "로맨틱 코미디 만화", label: "로맨틱 코미디" },
  { value: "공포 웹 만화", label: "공포" },
  { value: "무협 만화", label: "무협" },
  { value: "일상물 웹 만화", label: "일상" },
  { value: "고등학교를 배경으로 한 만화", label: "학원" },
  { value: "블랙 코미디", label: "블랙 코미디" },
];

export function GenreFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <MultiSelect
      data={GENRE_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="장르 필터"
      size="xs"
      clearable
      searchable
    />
  );
}
