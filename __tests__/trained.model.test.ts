import { localFileStream } from "@k-apps-io/llm-dsl";
import { ChatGPT } from "../src/ChatGPT";
describe("fine tuned model tokenization", () => {
  it("emit warning that the model is unsupported", async () => {
    const model = "unsupported-model";
    const warningListener = (warning: any) => {
      try {
        expect(warning.name).toBe("Warning");
        expect(warning.message).toBe(
          `Encoder could not be determined for model: ${model}`
        );
        process.removeListener("warning", warningListener);
      } catch (error) {
        fail(error); // Fail the test if an error occurs
      }
    };

    // Add a listener to capture warnings
    process.on("warning", warningListener);

    // Emit a warning
    const chat = new ChatGPT({ model });
  });

  it("fined tuned model", async () => {
    const chat = new ChatGPT({
      model: "ft:gpt-3.5-turbo-0613:kapps-llc::8otxFLnK",
    })
      .prompt({
        prompt: {
          role: "user",
          content: "hello",
        },
      })
      .pipe(
        localFileStream({ directory: __dirname, filename: "fined tuned model" })
      )
      .execute();
    await expect(chat).resolves.toBeDefined();
  }, 20000);
});
