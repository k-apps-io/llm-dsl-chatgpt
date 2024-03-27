import { DSL, localFileStream } from "@k-apps-io/llm-dsl";
import { ChatGPT, Options } from "../src/ChatGPT";
describe( "fine tuned model tokenization", () => {
  it( 'throw no encoder error', async () => {
    expect( () => new ChatGPT( { model: "unsupported-model" } ) ).toThrow();
  } );

  it( 'fined tuned model', async () => {
    const chat = new DSL<Options, any, undefined>( {
      llm: new ChatGPT( {
        model: "ft:gpt-3.5-turbo-0613:kapps-llc::8otxFLnK"
      } )
    } )
      .prompt( {
        message: "hello"
      } )
      .stream( localFileStream( { directory: __dirname, filename: "fined tuned model" } ) );
    await expect( chat ).resolves.toBeDefined();
  }, 20000 );
} );