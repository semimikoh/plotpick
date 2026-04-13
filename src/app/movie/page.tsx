import { Container, Center, Text, Title, Stack } from "@mantine/core";

export default function MoviePage() {
  return (
    <Container size="sm" h="100vh" px={{ base: "xs", sm: "md" }}>
      <Center h="100%">
        <Stack align="center" gap="xs">
          <Title order={3}>PlotPick — 영화</Title>
          <Text c="dimmed">준비 중입니다</Text>
        </Stack>
      </Center>
    </Container>
  );
}
