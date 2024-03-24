import { DSL, localFileStream } from "@k-apps-io/llm-dsl";
import { ChatGPT, Options } from "../src/ChatGPT";

const chat = new DSL<Options, any, undefined>( {
  llm: new ChatGPT( { model: "gpt-3.5-turbo" } )
} );
describe( "'Hello, World!'", () => {
  it( 'hello world', async () => {
    const $chat = chat
      .clone()
      .prompt( {
        message: "hello world"
      } )
      .stream( localFileStream( { directory: __dirname, filename: "hello.world" } ) );
    await expect( $chat ).resolves.toBeDefined();
  }, 20000 );
} );