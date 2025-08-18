import { LLM } from "@k-apps-io/llm-dsl";
import OpenAI from "openai";
import { Options, Prompts, Responses, ToolResults } from "../ChatGPT";

export const transcribe: LLM.Tool.Tool<
  Options,
  Prompts,
  Responses,
  ToolResults
> = {
  name: "transcribe",
  description: "Transcribe audio to text.",
  parameters: {
    type: "object",
    properties: {
      audio_url: {
        type: "string",
        description: "The URL of the audio file to transcribe.",
        example: "https://example.com/audio.mp3",
      },
      language: {
        type: "string",
        description: "The language of the audio (optional).",
        example: "en",
      },
      prompt: {
        type: "string",
        description: "Optional prompt to guide the transcription",
      },
    },
    required: ["audio_url"],
  },
  func: ({ audio_url, language, prompt, tool_call_id }) => {
    return new Promise<ToolResults>((resolve) => {
      fetch(audio_url)
        .then((res) => res.blob())
        .then((blob) => {
          const openai = new OpenAI();
          const file = new File([blob], "audio.mp3", {
            type: blob.type,
            lastModified: Date.now(),
          });
          return openai.audio.transcriptions.create({
            file,
            model: "whisper-1",
            language,
            prompt,
          });
        })
        .then((transcription) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Transcription: ${transcription.text}`,
              },
            ],
          });
        })
        .catch((error) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Error transcribing audio: ${error.message}`,
              },
            ],
          });
        });
    });
  },
};

export const translate: LLM.Tool.Tool<
  Options,
  Prompts,
  Responses,
  ToolResults
> = {
  name: "translate",
  description: "Translate audio to English text.",
  parameters: {
    type: "object",
    properties: {
      audio_url: {
        type: "string",
        description: "The URL of the audio file to translate.",
        example: "https://example.com/audio.mp3",
      },
      prompt: {
        type: "string",
        description: "Optional prompt to guide the translation",
      },
    },
    required: ["audio_url"],
  },
  func: ({ audio_url, prompt, tool_call_id }) => {
    return new Promise<ToolResults>((resolve) => {
      fetch(audio_url)
        .then((res) => res.blob())
        .then((blob) => {
          const openai = new OpenAI();
          const file = new File([blob], "audio.mp3", {
            type: blob.type,
            lastModified: Date.now(),
          });
          return openai.audio.translations.create({
            file,
            model: "whisper-1",
            prompt,
          });
        })
        .then((translation) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Translation: ${translation.text}`,
              },
            ],
          });
        })
        .catch((error) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Error translating audio: ${error.message}`,
              },
            ],
          });
        });
    });
  },
};

export const speech: LLM.Tool.Tool<Options, Prompts, Responses, ToolResults> = {
  name: "speech",
  description: "Generate speech from text.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to convert to speech.",
        example: "Hello, how are you today?",
      },
      voice: {
        type: "string",
        description: "The voice to use for generation.",
        enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
        default: "alloy",
      },
      model: {
        type: "string",
        description: "The model to use for generation.",
        enum: ["tts-1", "tts-1-hd"],
        default: "tts-1",
      },
    },
    required: ["text"],
  },
  func: ({ chat, text, voice = "alloy", model = "tts-1", tool_call_id }) => {
    return new Promise<ToolResults>((resolve) => {
      const openai = new OpenAI();
      openai.audio.speech
        .create({
          input: text,
          voice,
          model,
        })
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          return chat.storage.createArtifact({
            content: Buffer.from(buffer),
          });
        })
        .then((artifact) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Speech generated and saved as ${artifact.id}`,
              },
            ],
          });
        })
        .catch((error) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Error generating speech: ${error.message}`,
              },
            ],
          });
        });
    });
  },
};

export const suite: LLM.Tool.Suite<Options, Prompts, Responses, ToolResults> = {
  name: "audio",
  tools: [transcribe, translate, speech],
};
