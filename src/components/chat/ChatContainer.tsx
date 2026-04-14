"use client";

import {
  Stack, Title, Text, Center, Loader, Container, Paper, Button, Group,
} from "@mantine/core";
import { useState, useCallback, useRef, useMemo, memo } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { GenreSelector } from "@/components/chat/GenreSelector";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatMessage } from "@/components/chat/Message";
import type { SearchResult } from "@/core/search/vector";

type MediaType = "webtoon" | "movie";

const GenreBar = memo(function GenreBar({
  genres,
  selected,
  onClickGenre,
  onClear,
}: {
  genres: string[];
  selected: string[];
  onClickGenre: (genre: string) => void;
  onClear: () => void;
}) {
  return (
    <Group justify="center" gap={6} pb="sm" wrap="wrap" role="group" aria-label="장르 필터">
      {genres.map((genre) => (
        <Button
          key={genre}
          size="compact-xs"
          variant={selected.includes(genre) ? "filled" : "light"}
          onClick={() => onClickGenre(genre)}
          aria-pressed={selected.includes(genre)}
        >
          {genre}
        </Button>
      ))}
      <Button
        size="compact-xs"
        variant={selected.length === 0 ? "filled" : "light"}
        color="gray"
        onClick={onClear}
      >
        전체
      </Button>
    </Group>
  );
});

const PAGE_SIZE = 5;

const MEDIA_CONFIG = {
  webtoon: {
    title: "PlotPick — 웹툰",
    subtitle: "기억나는 장면이나 느낌을 말해보세요",
    searchApi: "/api/search",
    recommendApi: "/api/recommend",
    feedbackApi: "/api/feedback",
    placeholder: "어떤 웹툰을 찾고 있나요?",
    examples: ['"힐링되는 일상물"', '"무서운 공포 웹툰"', '"학교 배경 로맨스"'],
    genres: [
      "코미디", "액션", "로맨스", "공포", "무협",
      "일상", "학원", "판타지", "드라마", "스릴러",
    ],
    genreMap: {
      "코미디": "코미디 웹 만화",
      "액션": "액션 만화",
      "로맨스": "로맨스 웹 만화",
      "공포": "공포 웹 만화",
      "무협": "무협 만화",
      "일상": "일상물 웹 만화",
      "학원": "고등학교를 배경으로 한 만화",
      "판타지": "판타지",
      "드라마": "드라마",
      "스릴러": "스릴러",
    } as Record<string, string>,
  },
  movie: {
    title: "PlotPick — 영화",
    subtitle: "기억나는 장면이나 느낌을 말해보세요",
    searchApi: "/api/search-movies",
    recommendApi: "/api/recommend",
    feedbackApi: "/api/feedback",
    placeholder: "어떤 영화를 찾고 있나요?",
    examples: ['"반전 있는 스릴러"', '"눈물나는 가족 영화"', '"좀비 나오는 한국 영화"'],
    genres: [
      "액션", "모험", "코미디", "범죄", "드라마",
      "가족", "판타지", "공포", "미스터리", "로맨스",
      "SF", "스릴러", "전쟁", "애니메이션",
    ],
    genreMap: null,
  },
};

type SessionState =
  | { phase: "selecting"; query: string; allResults: SearchResult[]; page: number }
  | { phase: "refining"; query: string }
  | { phase: "done" }
  | null;

export function ChatContainer({ media = "webtoon" }: { media?: MediaType }) {
  const config = MEDIA_CONFIG[media];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const selectedGenresRef = useRef<string[]>([]);
  const [genreConfirmed, setGenreConfirmed] = useState(false);
  const sessionRef = useRef<SessionState>(null);
  const [, forceUpdate] = useState(0);

  const handleGenreConfirm = useCallback((selected: string[]) => {
    setSelectedGenres(selected);
    selectedGenresRef.current = selected;
    setGenreConfirmed(true);
  }, []);

  const handleGenreClick = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      const next = prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre];
      selectedGenresRef.current = next;
      return next;
    });
  }, []);

  const handleGenreClear = useCallback(() => {
    setSelectedGenres([]);
    selectedGenresRef.current = [];
  }, []);

  // LLM 응답 가져오기 (완성 후 한 번에 표시)
  const fetchLLM = useCallback(async (query: string, results: SearchResult[]): Promise<string> => {
    try {
      const res = await fetch(config.recommendApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, results }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
        return text;
      }
    } catch {
      // 무시
    }
    return "";
  }, [config.recommendApi]);

  // 카드 페이지 보여주기
  const showPage = useCallback((session: Extract<SessionState, { phase: "selecting" }>) => {
    const start = session.page * PAGE_SIZE;
    const pageResults = session.allResults.slice(start, start + PAGE_SIZE);

    if (pageResults.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `end-${Date.now()}`,
          role: "assistant",
          content: "모든 결과를 보여드렸어요. 다른 키워드로 다시 검색해보세요.",
        },
      ]);
      sessionRef.current = null;
      forceUpdate((n) => n + 1);
      return;
    }

    const pageNum = session.page + 1;
    const total = Math.ceil(session.allResults.length / PAGE_SIZE);

    setMessages((prev) => [
      ...prev,
      {
        id: `cards-${Date.now()}`,
        role: "assistant",
        content: pageNum === 1
          ? "이 중에 찾는 작품이 있나요?"
          : `다음 결과입니다. (${pageNum}/${total})`,
        results: pageResults,
        selectable: true,
      },
    ]);

    session.page++;
  }, []);

  // 이미 보여준 결과 ID 추적
  const shownIdsRef = useRef<Set<string>>(new Set());

  // 검색 실행
  const doSearch = useCallback(async (query: string, excludeShown = false) => {
    setLoading(true);

    try {
      const apiGenres: string[] = selectedGenresRef.current.map((g) => {
        const mapped = config.genreMap?.[g];
        return mapped ?? g;
      });

      const searchRes = await fetch(config.searchApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          count: 20,
          genres: apiGenres.length > 0 ? apiGenres : undefined,
        }),
      });

      if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
      const data = await searchRes.json();
      let results: SearchResult[] = data.results ?? [];

      // 이미 보여준 결과 제외
      if (excludeShown && shownIdsRef.current.size > 0) {
        results = results.filter((r) => !shownIdsRef.current.has(r.id));
      }

      if (results.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `empty-${Date.now()}`,
            role: "assistant",
            content: `"${query}"에 대한 결과가 없습니다. 다른 키워드로 시도해보세요.`,
          },
        ]);
        sessionRef.current = null;
        forceUpdate((n) => n + 1);
        return;
      }

      // LLM 분석 + 카드를 하나의 메시지로 (타이핑 후 카드 표시)
      const topResults = results.slice(0, PAGE_SIZE);
      const llmText = await fetchLLM(query, topResults);

      // shown ID 추가
      for (const r of topResults) {
        shownIdsRef.current.add(r.id);
      }

      // 세션 시작
      const session: Extract<SessionState, { phase: "selecting" }> = {
        phase: "selecting",
        query,
        allResults: results,
        page: 1, // 첫 페이지는 여기서 보여줌
      };
      sessionRef.current = session;
      forceUpdate((n) => n + 1);

      // LLM 텍스트 + 카드를 하나의 메시지로
      setMessages((prev) => [
        ...prev,
        {
          id: `result-${Date.now()}`,
          role: "assistant",
          content: llmText || "이 중에 찾는 작품이 있나요?",
          typing: !!llmText,
          results: topResults,
          selectable: true,
        },
      ]);
    } catch (err) {
      console.error("[chat]", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "검색 중 오류가 발생했습니다.",
        },
      ]);
      sessionRef.current = null;
      forceUpdate((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }, [fetchLLM, showPage, config.searchApi, config.genreMap]);

  // 새 검색
  const handleSubmit = useCallback(async (input: string) => {
    const session = sessionRef.current;

    // 정제 모드
    if (session?.phase === "refining") {
      const combinedQuery = `${session.query} ${input}`;

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: input },
      ]);

      sessionRef.current = null;
      forceUpdate((n) => n + 1);
      await doSearch(combinedQuery, true);
      return;
    }

    // 일반 검색
    sessionRef.current = null;
    shownIdsRef.current = new Set();
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: input },
    ]);
    await doSearch(input);
  }, [doSearch]);

  // 카드 선택
  const handleSelect = useCallback(async (webtoon: SearchResult) => {
    const session = sessionRef.current;
    if (session?.phase !== "selecting") return;

    const query = session.query;
    sessionRef.current = null;
    forceUpdate((n) => n + 1);

    setMessages((prev) =>
      prev.map((m) =>
        m.selectable ? { ...m, selectable: false, selectedId: webtoon.id } : m,
      ),
    );

    fetch(config.feedbackApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, webtoonId: webtoon.id }),
    }).catch(() => {});

    setMessages((prev) => [
      ...prev,
      {
        id: `found-${Date.now()}`,
        role: "assistant",
        content: `**${webtoon.title}** 찾으셨군요!`,
      },
    ]);

    sessionRef.current = { phase: "done" };
    forceUpdate((n) => n + 1);
  }, [config.feedbackApi]);

  // 다시 검색하기
  const handleReset = useCallback(() => {
    setMessages([]);
    sessionRef.current = null;
    shownIdsRef.current = new Set();
    forceUpdate((n) => n + 1);
  }, []);

  // "없어요"
  const handleNotFound = useCallback(() => {
    const session = sessionRef.current;
    if (session?.phase !== "selecting") return;

    sessionRef.current = { phase: "refining", query: session.query };
    forceUpdate((n) => n + 1);

    setMessages((prev) =>
      prev.map((m) => (m.selectable ? { ...m, selectable: false } : m)),
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `refine-${Date.now()}`,
        role: "assistant",
        content: "더 자세한 내용이 없나요? 기억나는 장면, 캐릭터, 분위기 등을 알려주시면 다시 찾아볼게요.",
      },
    ]);
  }, []);

  const messagesWithHandlers = useMemo(
    () => messages.map((m) =>
      m.selectable ? { ...m, onSelect: handleSelect } : m,
    ),
    [messages, handleSelect],
  );

  const session = sessionRef.current;
  const isSelecting = session?.phase === "selecting";
  const isRefining = session?.phase === "refining";
  const isDone = session?.phase === "done";

  return (
    <Container size="sm" h="100vh" px={{ base: "xs", sm: "md" }}>
      <Stack h="100%" gap={0}>
        <Stack align="center" py="md" gap={4}>
          <Title order={3}>{config.title}</Title>
          <Text size="sm" c="gray.6">
            {config.subtitle}
          </Text>
        </Stack>

        {/* 장르 미선택: 장르 선택 화면 (별도 컴포넌트로 리렌더링 격리) */}
        {!genreConfirmed && messages.length === 0 && (
          <GenreSelector
            genres={config.genres}
            onConfirm={handleGenreConfirm}
          />
        )}

        {/* 장르 선택 후: 상단에 작게 표시 (메모 컴포넌트) */}
        {genreConfirmed && (
          <GenreBar
            genres={config.genres}
            selected={selectedGenres}
            onClickGenre={handleGenreClick}
            onClear={handleGenreClear}
          />
        )}

        {genreConfirmed && messages.length === 0 && !loading && (
          <Center flex={1}>
            <Stack align="center" gap="xs">
              <Text size="lg" c="gray.6">검색 예시</Text>
              {config.examples.map((ex) => (
                <Text key={ex} size="sm" c="gray.6">{ex}</Text>
              ))}
            </Stack>
          </Center>
        )}

        {messages.length > 0 && <MessageList messages={messagesWithHandlers} />}

        {loading && (
          <Center p="sm" aria-live="polite" aria-label="검색 중">
            <Loader size="sm" />
          </Center>
        )}

        {isSelecting && !loading && (
          <Group justify="center" p="sm">
            <Button variant="light" color="gray" onClick={handleNotFound}>
              이 중에 없어요
            </Button>
          </Group>
        )}

        {isDone && (
          <Group justify="center" p="sm">
            <Button variant="light" onClick={handleReset}>
              다시 검색하기
            </Button>
          </Group>
        )}

        {genreConfirmed && (
          <Paper py="md">
            <Stack gap="xs">
              {isRefining && (
                <Text size="xs" c="blue" ta="center">
                  기억나는 내용을 더 입력해주세요
                </Text>
              )}
              <ChatInput
                onSubmit={handleSubmit}
                loading={loading}
                placeholder={config.placeholder}
              />
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
