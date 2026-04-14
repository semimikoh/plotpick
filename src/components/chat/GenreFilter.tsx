"use client";

import { MultiSelect } from "@mantine/core";
import { memo } from "react";

const WEBTOON_GENRES = [
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

const MOVIE_GENRES = [
  { value: "액션", label: "액션" },
  { value: "모험", label: "모험" },
  { value: "애니메이션", label: "애니메이션" },
  { value: "코미디", label: "코미디" },
  { value: "범죄", label: "범죄" },
  { value: "드라마", label: "드라마" },
  { value: "가족", label: "가족" },
  { value: "판타지", label: "판타지" },
  { value: "역사", label: "역사" },
  { value: "공포", label: "공포" },
  { value: "음악", label: "음악" },
  { value: "미스터리", label: "미스터리" },
  { value: "로맨스", label: "로맨스" },
  { value: "SF", label: "SF" },
  { value: "스릴러", label: "스릴러" },
  { value: "전쟁", label: "전쟁" },
];

export const GenreFilter = memo(function GenreFilter({
  value,
  onChange,
  media = "webtoon",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  media?: "webtoon" | "movie";
}) {
  const options = media === "movie" ? MOVIE_GENRES : WEBTOON_GENRES;

  return (
    <MultiSelect
      data={options}
      value={value}
      onChange={onChange}
      placeholder="장르 필터"
      size="xs"
      clearable
      searchable
    />
  );
});
