import { DSL, LocalStorage } from "@k-apps.io/llm-dsl";
import { ChatGPT, Options } from "../src/ChatGPT";

const chat = new DSL<Options, any>( {
  llm: new ChatGPT( {}, "gpt-3.5-turbo" ),
  storage: LocalStorage,
  options: {
    model: "gpt-3.5-turbo"
  },
  metadata: {}
} );
describe( "'Hello, World!'", () => {
  it( 'hello world', async () => {
    await chat
      .clone()
      .prompt( {
        message: "hello world"
      } )
      .execute();
    expect( true ).toBe( true );
  }, 20000 );
} );