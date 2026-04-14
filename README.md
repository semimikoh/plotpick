# PlotPick

> "그 영화 뭐였지? 가족이 여행 가서 다른 가족 만났는데..." -- 흐릿한 기억만으로 영화를 찾아주는 의미 검색 챗봇

**[plotpick.vercel.app](https://plotpick.vercel.app)**

## 소개

줄거리, 배우, 분위기 등 기억나는 단편적인 정보를 입력하면 영화를 찾아주는 RAG(Retrieval-Augmented Generation) 기반 검색 웹앱입니다.

- "휴양지에서 만난 가족이 유괴범이었던 영화" -- 흐릿한 줄거리 회상
- "제임스 맥어보이 나온 스릴러" -- 배우 + 장르 검색
- "스픽 노 이블" -- 정확한 제목 검색
- "반전 있는 공포 영화" -- 분위기 기반 추천

벡터 검색(의미)과 키워드 검색(제목/배우/감독)을 RRF(Reciprocal Rank Fusion)로 합쳐, 하나의 검색창으로 다양한 검색 의도를 처리합니다.

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 (App Router) | App Router 기반 라우팅, API Route로 백엔드 통합 |
| UI | Mantine v9 | 시맨틱 컴포넌트 + 다크모드 + 반응형 |
| 벡터 DB | Supabase (pgvector + HNSW) | 별도 벡터 DB 인프라 없이 RDB + 벡터 검색 통합 |
| 임베딩 | OpenAI text-embedding-3-large (1536차원) | small 대비 검색 정확도 향상, 차원 축소로 HNSW 호환 유지 |
| 검색 | 하이브리드 (벡터 + 키워드 + cast RRF) | 의미 검색 + 제목/배우/감독 매칭을 하나의 API로 |
| 가상화 | @tanstack/react-virtual | 메시지 목록 가상 스크롤, DOM 없이 높이 사전 계산 |
| CLI | Commander + tsx | 백엔드 로직을 터미널에서 직접 검증 |
| 테스트 | Vitest | 유닛 테스트 커버리지 94% |
| 배포 | Vercel + Supabase Cloud | 프론트엔드/DB 각각 관리형 서비스 |

---

## 데이터

| 소스 | 편수 | 수집 방법 |
| --- | --- | --- |
| TMDB 한국 영화 | ~1,500편 | TMDB 공식 API (평점 6+, 투표 100+) |
| TMDB 외국 영화 | ~2,700편 | TMDB 공식 API (평점 6+, 투표 500+) |

각 영화에 **주요 배우 5명 + 감독** 정보를 TMDB credits API로 수집하여, 임베딩 텍스트와 키워드 검색에 모두 활용합니다.

```
제목: 스픽 노 이블
장르: 공포, 스릴러
감독: 제임스 왓킨스
출연: 제임스 맥어보이, 맥켄지 데이비스, 스쿠트 맥네리, ...
설명: 휴양지에서 처음 만나 우연히 함께 휴가를 보내게 된 두 가족...
```

민간 플랫폼 직접 크롤링은 의도적으로 피했습니다. **공식 API와 공개 데이터셋만 사용합니다.**

---

## 디렉토리 구조

```
src/
├── core/             # 백엔드 로직 (React/Next 무관, 순수 TypeScript)
│   ├── search/       #   벡터/키워드/하이브리드 검색 + cast RPC
│   ├── embeddings/   #   OpenAI text-embedding-3-large (1536차원 축소)
│   ├── tmdb/         #   TMDB API 수집 + credits(배우/감독) 보강
│   ├── data/         #   데이터 정제 + 통합
│   ├── db/           #   Supabase 클라이언트 (단일 인스턴스)
│   └── llm/          #   장르 추론 + 추천 응답 생성
│
├── cli/              # CLI 진입점 (core를 터미널에서 실행)
│   └── commands/     #   fetch-movies, embed-movies, search
│
├── app/              # Next.js App Router
│   ├── movie/        #   영화 검색 페이지
│   └── api/          #   search-movies, recommend, feedback
│
├── components/       # React 컴포넌트
│   ├── chat/         #   ChatContainer, MessageList, TypeWriter, GenreSelector
│   └── recommendation/  # ContentCard, RecommendationCards
│
├── lib/
│   └── text-layout/  #   자체 텍스트 측정 모듈 (아래 상세)
│
└── tests/            # Vitest 유닛 테스트 (커버리지 94%)
```

**핵심 설계 원칙: `src/core/`에 비즈니스 로직 격리**

- `core/`는 React/Next.js에 의존하지 않는 순수 TypeScript
- CLI와 API Route가 같은 함수를 공유
- 새 기능은 항상 **CLI에서 먼저 검증** 후 UI에 연결

---

## 검색 파이프라인

```
사용자 입력 ("가족 여행 중 만난 유괴범, 제임스 맥어보이")
  |
  v
장르 선택 (공포, 스릴러 -- 사용자가 직접 선택 or "모르겠다")
  |
  v
POST /api/search-movies
  |
  +---> 벡터 검색: text-embedding-3-large -> pgvector 코사인 유사도
  |     (임베딩 텍스트에 제목/장르/감독/출연/줄거리 포함)
  |
  +---> 키워드 검색: ILIKE 제목/설명/감독
  |     + search_movies_by_cast RPC (배우 이름 검색)
  |
  v
RRF (Reciprocal Rank Fusion)
  + 제목 일치 부스트 (완전 일치 시 +40%)
  + 배우/감독 매칭 부스트 (+30%)
  + 절대 유사도 스케일링 (코사인 0.25~0.70 -> 0~100%)
  |
  v
LLM 추천 분석 -> TypeWriter 어절 단위 애니메이션 -> 카드 렌더링
```

### 하이브리드 검색 상세

벡터 검색만으로는 "제임스 맥어보이"같은 고유명사 매칭이 약하고, 키워드 검색만으로는 "가족이 여행 가서 유괴범 만나는" 같은 서술형 검색이 불가능합니다. 두 결과를 **RRF(Reciprocal Rank Fusion)** 로 합산합니다:

```typescript
// RRF: 각 검색 결과의 순위 기반 점수 합산
const rrfScore = 1 / (RRF_K + rank + 1);

// 제목 정확 매칭 부스트
const titleMatch = calcTitleMatchRatio(result.title, query);

// 배우/감독 매칭 부스트
const castMatch = result.cast_members.some(c => query.includes(c)) ? 0.5 : 0;

// 최종 표시 점수: 코사인 유사도 + 제목/cast 부스트 -> 0~100% 스케일링
const displayScore = scaleScore(rawSimilarity, titleMatch, castMatch);
```

---

## 자체 텍스트 측정 모듈

> Canvas 기반 워드프로세서 개발 경험([블로그 글](https://velog.io/@semimi/%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-%EA%B3%BC%EC%97%B0-%EC%82%AC%EC%9A%A9%ED%95%A0-%EC%9D%BC%EC%9D%B4-%EC%97%86%EC%9D%84%EA%B9%8C%EC%9A%94))에서 구현한 O(log n) 줄바꿈 최적화를 RAG 챗봇 도메인에 적용했습니다.

### 문제

채팅 메시지의 높이를 알아야 가상 스크롤(virtualization)이 동작합니다. 일반적인 접근법은 DOM에 렌더링한 뒤 높이를 측정하는 것인데, 이 방식은:

1. **reflow 비용** -- 메시지 추가/리사이즈마다 브라우저 layout 재계산
2. **가상화 불가** -- 화면 밖 메시지의 높이를 모르면 스크롤 위치 계산 불가

### 해결: DOM 없이 텍스트 높이 사전 계산

```
src/lib/text-layout/
├── cache.ts          # LRU 캐시 (font + text -> width, 최대 2000항목)
├── measure.ts        # Canvas measureText + 누적 폭 배열 (Float64Array)
├── prepared.ts       # 이진탐색 줄바꿈 + 마크다운 파싱 + 복합 높이 추정
└── use-message-height.ts  # React 훅 + @tanstack/react-virtual 연동
```

### 알고리즘 상세

**1단계: 누적 폭 배열 생성 -- O(n)**

Canvas `measureText` API로 각 문자의 폭을 측정하고, 누적합을 `Float64Array`에 저장합니다. 임의 구간 `text[a..b]`의 폭을 `arr[b] - arr[a]`로 O(1)에 계산할 수 있습니다.

```typescript
function buildCumulativeWidths(text: string, font: FontDescriptor): Float64Array {
  const arr = new Float64Array(text.length + 1);
  arr[0] = 0;
  for (let i = 0; i < text.length; i++) {
    arr[i + 1] = arr[i] + ctx.measureText(text[i]).width;
  }
  return arr;
}
// "안녕하세요" -> [0, 14.2, 28.4, 42.6, 56.8, 71.0]
```

**2단계: 이진탐색으로 줄바꿈 -- O(log n) per line**

한 줄에 들어가는 최대 문자 인덱스를 누적 폭 배열에서 이진탐색합니다. 선형 탐색(한 글자씩 폭 체크)이 O(n)인 반면, 이 방식은 **O(log n)** 입니다.

```typescript
// 이진탐색: containerWidth 안에 들어가는 최대 인덱스
while (lo < hi) {
  const mid = (lo + hi + 1) >>> 1;
  const lineWidth = cumWidths[mid] - cumWidths[lineStart];
  if (lineWidth <= availableWidth) {
    lo = mid;       // 더 넣을 수 있음
  } else {
    hi = mid - 1;   // 초과
  }
}
// lo = 한 줄에 들어가는 최대 문자 인덱스
// -> 띄어쓰기 경계로 후퇴하여 자연스러운 줄바꿈
```

**3단계: 복합 메시지 높이 계산**

채팅 메시지는 텍스트만이 아니라 마크다운, 추천 카드, 장르 버튼이 복합적으로 들어갑니다. 각 요소의 높이를 합산하여 DOM 없이 전체 높이를 추정합니다.

```typescript
function estimateMessageHeight(message: MessageLike, containerWidth: number): number {
  let height = 0;

  // 마크다운 텍스트: 세그먼트별 폰트/크기 적용 -> 줄 수 합산
  height += prepareMarkdownLayout(message.content, params).height;

  // 추천 카드: SimpleGrid 열 수 계산 -> 행 수 x 고정 높이
  if (message.results) {
    const cols = containerWidth >= 576 ? 2 : 1;  // Mantine sm breakpoint
    height += Math.ceil(message.results.length / cols) * 130;
  }

  return Math.max(height, 40);
}
```

### TypeWriter: 어절 단위 타이핑 애니메이션

LLM 응답을 완성될 때까지 받아놓고, 어절(띄어쓰기) 단위로 순차 표시합니다.

```typescript
// 어절 경계 인덱스 배열 생성
function buildWordEndIndices(text: string): number[] {
  const breaks: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " || text[i] === "\n") breaks.push(i + 1);
  }
  breaks.push(text.length);
  return breaks;
}
// "혹시 스픽 노 이블 아닌가요?"
// -> step 0: ""
// -> step 1: "혹시 "
// -> step 2: "혹시 스픽 "
// -> step 3: "혹시 스픽 노 "
// -> ...완료 후 추천 카드 표시
```

- 텍스트 측정 모듈로 **최종 높이를 미리 계산**하여 컨테이너 크기 고정
- 타이핑 중에도 레이아웃 점프 없음
- 한글은 글자 단위보다 **어절 단위가 읽는 리듬과 맞아** 자연스러움

---

## 렌더링 최적화

| 대상 | 기법 | 효과 |
| --- | --- | --- |
| GenreSelector | `memo` + state 격리 | 장르 버튼 클릭 시 ChatContainer 리렌더 방지 |
| GenreBar | `memo` 분리 | 검색 중 장르 바 불필요한 리렌더 방지 |
| messagesWithHandlers | `useMemo` | 메시지 배열 불필요한 재생성 방지 |
| MessageList | `memo` + 가상화 | 화면에 보이는 메시지만 렌더링 |
| ChatInput | `useCallback` + `useRef` | 입력 중 부모 리렌더 방지 |

---

## 접근성

- 장르 버튼: `role="group"`, `aria-pressed`
- 추천 카드: `role="button"`, `tabIndex`, 키보드(Enter/Space) 선택
- 메시지 목록: `role="log"`, `aria-live="polite"`
- 로딩 상태: `aria-live="polite"`, `aria-label`
- 색상 대비: WCAG AA 충족 (Lighthouse Accessibility 93+)

---

## 테스트

```bash
pnpm test          # 전체 테스트 실행
pnpm test:watch    # 감시 모드
```

| 모듈 | 테스트 항목 | 커버리지 |
| --- | --- | --- |
| text-layout/cache | LRU 동작, 용량 초과, set/get/clear | 100% |
| text-layout/prepared | 이진탐색 줄바꿈, 마크다운 파싱, 복합 메시지 높이 | 97% |
| search/movie-hybrid | RRF 합산, 제목/cast 부스트, 임계값 필터 | 94% |
| data/clean | 위키 정제, CSV 파싱, 중복 제거, 장르 추출 | 91% |
| **전체** | **50개 테스트** | **Statements 94%, Lines 98%** |

---

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, TMDB_ACCESS_TOKEN

# 개발 서버
pnpm dev

# CLI 검색
pnpm cli search "제임스 맥어보이 스릴러"
```

### 데이터 파이프라인

```bash
pnpm cli fetch-movies   # TMDB에서 영화 + 배우/감독 수집 (~5분)
pnpm cli embed-movies   # 임베딩 생성 + Supabase 적재
```

