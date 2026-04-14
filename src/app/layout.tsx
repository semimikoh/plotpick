import "@mantine/core/styles.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Providers } from "@/components/providers/Providers";

export const metadata = {
  title: "PlotPick",
  description: "콘텐츠 회상·추천 RAG 챗봇",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
