"use client";

import { Box } from "@mantine/core";
import { memo } from "react";
import { Message, type ChatMessage } from "@/components/chat/Message";
import { useMessageVirtualizer } from "@/lib/text-layout/use-message-height";

export const MessageList = memo(function MessageList({ messages }: { messages: ChatMessage[] }) {
  const { virtualizer, scrollRef } = useMessageVirtualizer(messages);

  return (
    <Box
      ref={scrollRef}
      flex={1}
      style={{ overflow: "auto" }}
      p="md"
    >
      <Box
        pos="relative"
        w="100%"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const msg = messages[virtualItem.index];
          return (
            <Box
              key={msg.id}
              pos="absolute"
              top={0}
              left={0}
              w="100%"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <Message message={msg} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});
