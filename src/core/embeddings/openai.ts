import OpenAI from "openai";

const MODEL = "text-embedding-3-large";
const BATCH_SIZE = 100;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
  }
  return new OpenAI({ apiKey });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(
      `[embed] 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length}건)`,
    );

    const res = await client.embeddings.create({
      model: MODEL,
      input: batch,
      dimensions: 1536,
    });

    for (const item of res.data) {
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}
