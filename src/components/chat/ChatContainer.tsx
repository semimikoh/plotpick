"use client";

import {
  Stack, Title, Text, Center, Loader, Container, Paper, Button, Group,
} from "@mantine/core";
import { useState, useCallback, useRef } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { GenreFilter } from "@/components/chat/GenreFilter";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatMessage } from "@/components/chat/Message";
import type { SearchResult } from "@/core/search/vector";

const PAGE_SIZE = 5;

type SessionState =
  | { phase: "selecting"; query: string; allResults: SearchResult[]; page: number }
  | { phase: "refining"; query: string }
  | null;

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const genresRef = useRef(genres);
  genresRef.current = genres;
  const sessionRef = useRef<SessionState>(null);
  const [, forceUpdate] = useState(0);

  // LLM 스트리밍 헬퍼
  const streamLLM = useCallback(async (query: string, results: SearchResult[]) => {
    const llmId = `llm-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: llmId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/recommend", {
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
          const current = text;
          setMessages((prev) =>
            prev.map((m) => (m.id === llmId ? { ...m, content: current } : m)),
          );
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === llmId ? { ...m, content: "답변을 생성하지 못했습니다." } : m,
        ),
      );
    }
  }, []);

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
          ? "이 중에 찾는 웹툰이 있나요?"
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
      const currentGenres = genresRef.current;
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          count: 20,
          genres: currentGenres.length > 0 ? currentGenres : undefined,
          autoGenre: currentGenres.length === 0,
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

      // LLM 분석 스트리밍
      const topResults = results.slice(0, PAGE_SIZE);
      await streamLLM(query, topResults);

      // shown ID 추가
      for (const r of results.slice(0, PAGE_SIZE)) {
        shownIdsRef.current.add(r.id);
      }

      // 세션 시작 + 첫 페이지 카드
      const session: Extract<SessionState, { phase: "selecting" }> = {
        phase: "selecting",
        query,
        allResults: results,
        page: 0,
      };
      sessionRef.current = session;
      forceUpdate((n) => n + 1);
      showPage(session);
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
  }, [streamLLM, showPage]);

  // 새 검색
  const handleSubmit = useCallback(async (input: string) => {
    const session = sessionRef.current;

    // 정제 모드: 추가 답변 + 원래 검색어 합쳐서 재검색 (이전 결과 제외)
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

    // 일반 검색 (shown IDs 리셋)
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

    // 선택 표시
    setMessages((prev) =>
      prev.map((m) =>
        m.selectable ? { ...m, selectable: false, selectedId: webtoon.id } : m,
      ),
    );

    // 피드백 저장
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, webtoonId: webtoon.id }),
    }).catch(() => {});

    setMessages((prev) => [
      ...prev,
      {
        id: `found-${Date.now()}`,
        role: "assistant",
        content: `**${webtoon.title}** 찾으셨군요! 기억해둘게요.`,
      },
    ]);
  }, [streamLLM]);

  // "없어요" → 바로 정제 모드
  const handleNotFound = useCallback(() => {
    const session = sessionRef.current;
    if (session?.phase !== "selecting") return;

    sessionRef.current = { phase: "refining", query: session.query };
    forceUpdate((n) => n + 1);

    // 선택 불가로 변경
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

  // 메시지에 핸들러 주입
  const messagesWithHandlers = messages.map((m) =>
    m.selectable ? { ...m, onSelect: handleSelect } : m,
  );

  const session = sessionRef.current;
  const isSelecting = session?.phase === "selecting";
  const isRefining = session?.phase === "refining";

  return (
    <Container size="sm" h="100vh" px={{ base: "xs", sm: "md" }}>
      <Stack h="100%" gap={0}>
        <Stack align="center" py="md" gap={4}>
          <Title order={3}>PlotPick</Title>
          <Text size="sm" c="dimmed">
            기억나는 장면이나 느낌을 말해보세요
          </Text>
        </Stack>

        {messages.length === 0 && !loading && (
          <Center flex={1}>
            <Stack align="center" gap="xs">
              <Text size="lg" c="dimmed">검색 예시</Text>
              <Text size="sm" c="dimmed">&quot;힐링되는 일상물&quot;</Text>
              <Text size="sm" c="dimmed">&quot;무서운 공포 웹툰&quot;</Text>
              <Text size="sm" c="dimmed">&quot;학교 배경 로맨스&quot;</Text>
            </Stack>
          </Center>
        )}

        {messages.length > 0 && <MessageList messages={messagesWithHandlers} />}

        {loading && (
          <Center p="sm">
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

        <Paper py="md">
          <Stack gap="xs">
            {isRefining && (
              <Text size="xs" c="blue" ta="center">
                기억나는 내용을 더 입력해주세요
              </Text>
            )}
            <GenreFilter value={genres} onChange={setGenres} />
            <ChatInput
              onSubmit={handleSubmit}
              loading={loading}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
