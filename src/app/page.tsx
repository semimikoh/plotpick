import { Container, Title, Text, Stack, Card, SimpleGrid } from "@mantine/core";
import { IconBook2, IconMovie } from "@tabler/icons-react";
import Link from "next/link";

export default function Home() {
  return (
    <Container size="sm" h="100vh" px={{ base: "xs", sm: "md" }}>
      <Stack h="100%" justify="center" align="center" gap="xl">
        <Stack align="center" gap="xs">
          <Title order={1}>PlotPick</Title>
          <Text c="dimmed" ta="center">
            흐릿한 기억만으로 콘텐츠를 찾아드려요
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" w="100%">
          <Link href="/webtoon" style={{ textDecoration: "none" }}>
            <Card withBorder radius="md" p="lg" style={{ cursor: "pointer" }}>
              <Stack align="center" gap="sm">
                <IconBook2 size={40} stroke={1.5} />
                <Title order={3}>웹툰</Title>
                <Text size="sm" c="dimmed" ta="center">
                  네이버, 카카오 웹툰 4,700편+
                </Text>
              </Stack>
            </Card>
          </Link>

          <Link href="/movie" style={{ textDecoration: "none" }}>
            <Card withBorder radius="md" p="lg" style={{ cursor: "pointer" }}>
              <Stack align="center" gap="sm">
                <IconMovie size={40} stroke={1.5} />
                <Title order={3}>영화</Title>
                <Text size="sm" c="dimmed" ta="center">
                  한국 영화 (준비 중)
                </Text>
              </Stack>
            </Card>
          </Link>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
