import { localFileStream } from "@k-apps-io/llm-dsl";
import sharp from "sharp";
import { ChatGPT } from "../src/ChatGPT";
const chat = new ChatGPT(
  { model: "gpt-4o-mini" },
  { settings: { windowSize: 200000 } }
);

describe("Modality", () => {
  it("should describe the image", async () => {
    const imagePath = `${__dirname}/image_01.png`;
    const imageBuffer = await sharp(imagePath).resize(100).toBuffer();
    const imageBase64 = imageBuffer.toString("base64");
    await chat
      .clone()
      .prompt(() => ({
        prompt: {
          role: "user",
          content: `What is in this image? ${imageBase64}`,
        },
      }))
      .pipe(
        localFileStream({ directory: __dirname, filename: "image.response" })
      )
      .execute();
  }, 60000);
});
