"use client";

import { Box } from "@mantine/core";
import { useState, useEffect, useRef, useMemo } from "react";
import Markdown from "react-markdown";

// 텍스트를 어절(띄어쓰기) 단위로 끊어서 인덱스 배열 생성
function buildWordEndIndices(text: string): number[] {
  const breaks: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " || text[i] === "\n") {
      breaks.push(i + 1);
    }
  }
  breaks.push(text.length);
  return breaks;
}

export function TypeWriter({
  text,
  speed = 40,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [step, setStep] = useState(0);
  const completeCalledRef = useRef(false);
  const wordBreaks = useMemo(() => buildWordEndIndices(text), [text]);

  useEffect(() => {
    setStep(0);
    completeCalledRef.current = false;
  }, [text]);

  useEffect(() => {
    if (step >= wordBreaks.length) {
      if (!completeCalledRef.current) {
        completeCalledRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setStep((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [step, wordBreaks, speed, onComplete]);

  const revealedLen = step >= wordBreaks.length ? text.length : (wordBreaks[step - 1] ?? 0);
  const revealed = step === 0 ? "" : text.slice(0, revealedLen);
  const done = revealedLen >= text.length;

  return (
    <Box fz="sm">
      <Markdown>{done ? text : revealed}</Markdown>
    </Box>
  );
}
