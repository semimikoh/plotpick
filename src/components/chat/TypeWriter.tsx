"use client";

import { Box } from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";

export function TypeWriter({
  text,
  speed = 15,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [revealedLen, setRevealedLen] = useState(0);
  const completeCalledRef = useRef(false);

  useEffect(() => {
    setRevealedLen(0);
    completeCalledRef.current = false;
  }, [text]);

  useEffect(() => {
    if (revealedLen >= text.length) {
      if (!completeCalledRef.current) {
        completeCalledRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setRevealedLen((prev) => Math.min(prev + Math.ceil(Math.random() * 3), text.length));
    }, speed);

    return () => clearTimeout(timer);
  }, [revealedLen, text, speed, onComplete]);

  const revealed = text.slice(0, revealedLen);
  const done = revealedLen >= text.length;

  // 가상화에서 높이를 측정하므로 투명 텍스트 해킹 불필요
  // virtualizer.measureElement가 실제 DOM 높이를 측정해서 보정
  return (
    <Box fz="sm">
      <Markdown>{done ? text : revealed}</Markdown>
    </Box>
  );
}
