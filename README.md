# PlotPick

> "예전에 본 그 웹툰 뭐였지?" -- 흐릿한 기억만으로 웹툰을 찾아주는 의미 검색 챗봇

**[plotpick.vercel.app](https://plotpick.vercel.app)**

## 소개

키워드나 감성을 입력하면 한국 웹툰을 찾아주는 RAG(Retrieval-Augmented Generation) 기반 검색 웹앱입니다.

- "힐링되는 일상물" -- 의미 기반 추천
- "귀신 보는 남자 로맨스" -- 흐릿한 줄거리 회상
- "마음의소리" -- 정확한 제목 검색

벡터 검색(의미)과 키워드 검색(정확)을 RRF(Reciprocal Rank Fusion)로 합쳐 두 가지 검색 니즈를 하나의 엔진으로 처리합니다.

## 데이터

1,722편의 웹툰 메타데이터를 3개 소스에서 수집했습니다.

| 소스 | 편수 | 수집 방법 |
| --- | --- | --- |
| 위키백과 | 102편 | MediaWiki 공식 API (줄거리 + 카테고리) |
| 카카오웹툰 | 1,288편 | 공개 GitHub 데이터셋 (제목/장르/설명) |
| 네이버웹툰 | 344편 | 공개 GitHub 데이터셋 (제목/장르/설명) |

민간 플랫폼 직접 크롤링은 의도적으로 피했습니다. 약관/저작권 리스크 대신 공식 API와 공개 데이터셋을 활용합니다.

## 기술 스택

| 영역 | 기술 | 선택 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 15 (App Router) | RSC로 카드 컴포넌트 서버 렌더링, 클라이언트 번들 최소화 |
| UI | Mantine v7 | Tailwind 없이 시맨틱 컴포넌트 + 다크모드 + 반응형 |
| 벡터 DB | Supabase (pgvector + HNSW) | 별도 벡터 DB 인프라 없이 RDB + 벡터 검색 통합 |
| 임베딩 | OpenAI text-embedding-3-small | 1536차원, 한국어 성능 우수, 비용 효율적 |
| 검색 | 하이브리드 (벡터 + 키워드 RRF) | 의미 검색 + 정확 매칭을 하나의 API로 |
| CLI | Commander + tsx | 백엔드 로직을 터미널에서 직접 검증 |
| 배포 | Vercel + Supabase Cloud | 프론트엔드/DB 각각 관리형 서비스 |

## 아키텍처

```
src/
├── core/           # 백엔드 로직 (React/Next 무관)
│   ├── wiki/       #   위키백과 API 수집
│   ├── data/       #   데이터 정제 + 통합
│   ├── db/         #   Supabase 클라이언트
│   ├── embeddings/ #   OpenAI 임베딩
│   └── search/     #   벡터/키워드/하이브리드 검색
│
├── cli/            # CLI 진입점 (core를 터미널에서 실행)
│   └── commands/   #   fetch, clean, embed, search
│
├── app/            # Next.js App Router
│   ├── page.tsx    #   챗 UI 페이지
│   └── api/search/ #   검색 API (core 함수의 HTTP 래퍼)
│
└── components/     # React 컴포넌트
    ├── chat/       #   ChatContainer, MessageList, ChatInput
    └── recommendation/  # WebtoonCard, RecommendationCards
```

**핵심 설계 원칙: `src/core/`에 비즈니스 로직 격리**

- `core/`는 React/Next.js에 의존하지 않는 순수 TypeScript
- CLI와 API Route가 같은 함수를 공유
- 새 기능은 항상 CLI에서 먼저 검증 후 UI에 연결

## 검색 파이프라인

```
사용자 입력
  |
  v
POST /api/search
  |
  +---> 벡터 검색: OpenAI 임베딩 -> pgvector 코사인 유사도 top-K
  |
  +---> 키워드 검색: PostgreSQL ILIKE 제목/설명 매칭
  |
  v
RRF (Reciprocal Rank Fusion) 합산
  |
  v
카드 UI 렌더링 (유사도 시각화 + 장르 필터)
```

## RSC vs Client 컴포넌트 경계

| 서버 컴포넌트 (RSC) | 클라이언트 컴포넌트 |
| --- | --- |
| WebtoonCard | ChatContainer |
| RecommendationCards | MessageList |
| 페이지 레이아웃 | ChatInput |
| | GenreFilter |
| | Providers |

인터랙션이 필요한 영역만 `'use client'`로 격리하여 클라이언트 번들 크기를 최소화했습니다.

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY 채우기

# 개발 서버
pnpm dev

# CLI 검색 (터미널)
pnpm cli search "힐링 일상물"
```

### 데이터 파이프라인 (선택)

```bash
pnpm cli fetch    # 위키백과에서 웹툰 데이터 수집
pnpm cli clean    # 위키 + 카카오 + 네이버 데이터 통합 정제
pnpm cli embed    # OpenAI 임베딩 생성 + Supabase 적재
```

## 향후 계획 (v2)

- **LLM 답변 생성** -- 검색 결과를 컨텍스트로 LLM에 주입, 자연어 추천 답변 스트리밍
- **자체 텍스트 측정 모듈** -- Canvas measureText + 이진탐색 기반 높이 계산, LLM 스트리밍 시 reflow 최소화
- **매체 확장** -- 영화, 드라마, 웹소설로 검색 범위 확대
- **사용자 인증 + 개인 라이브러리** -- Supabase Auth + RLS, 사용자별 작품 등록
