import { localFileStream } from "@k-apps-io/llm-dsl";
import { ChatGPT } from "../src/ChatGPT";

const chat = new ChatGPT({ model: "gpt-4o-mini" });

describe("'Hello, World!'", () => {
  it("hello world", async () => {
    await chat
      .clone()
      .prompt({
        prompt: {
          role: "user",
          content: "Hello, World!",
        },
      })
      .pipe(localFileStream({ directory: __dirname, filename: "hello.world" }))
      .execute();
  }, 20000);
});
