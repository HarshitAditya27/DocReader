import { OpenAIApi, Configuration } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, ""),
    });
    const results = await response.json();
    return results.data[0].embeddings as number[];
  } catch (error) {
    console.log("error calling openai embeddings api", error);
    throw error;
  }
}
