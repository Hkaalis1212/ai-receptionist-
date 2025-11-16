import { ElevenLabsClient } from "elevenlabs";

export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }
  
  return new ElevenLabsClient({ apiKey });
}

export async function textToSpeech(
  text: string, 
  voiceId?: string
): Promise<Buffer> {
  const client = getElevenLabsClient();
  
  const defaultVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
  
  const audioStream = await client.textToSpeech.convert(defaultVoiceId, {
    text,
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  });
  
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

export async function getAvailableVoices() {
  const client = getElevenLabsClient();
  
  try {
    const voices = await client.voices.getAll();
    return voices.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
    }));
  } catch (error) {
    console.error("Error fetching ElevenLabs voices:", error);
    return [];
  }
}
