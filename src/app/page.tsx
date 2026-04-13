import { Button, Container, Stack, Text, Title } from "@mantine/core";

export default function Home() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="md">
        <Title order={1}>PlotPick</Title>
        <Text c="dimmed">콘텐츠 회상·추천 RAG 챗봇</Text>
        <Button variant="filled">시작하기</Button>
      </Stack>
    </Container>
  );
}
