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

  return (
    <Box pos="relative" fz="sm">
      {/* 전체 텍스트로 높이 확보 (투명) */}
      {!done && (
        <Box style={{ color: "transparent", userSelect: "none" }} aria-hidden>
          <Markdown>{text}</Markdown>
        </Box>
      )}
      {/* 타이핑 중인 텍스트 (위에 겹침) */}
      <Box pos={done ? "relative" : "absolute"} top={0} left={0} right={0}>
        <Markdown>{done ? text : revealed}</Markdown>
      </Box>
    </Box>
  );
}
