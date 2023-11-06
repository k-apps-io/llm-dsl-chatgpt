import { encoding_for_model } from "tiktoken";


describe( "token calculations", () => {
  it( 'token match', async () => {
    const text = `# Context
    In your DSL script, the \`context\` is like a shared memory that enables the seamless exchange of information between different commands and prompts. It's a vital tool for tasks that involve gathering, adjusting, or retrieving data across multiple interactions. The \`context\` ensures your conversation flows cohesively and empowers you to manage and transfer artifacts effortlessly.
    
    To harness the power of the \`context\`, you can use commands like [response](#response) and [expect](#expect).
    `;
    const gpt35 = encoding_for_model( "gpt-3.5-turbo" );
    const gpt4 = encoding_for_model( "gpt-4" );
    const gpt35Tokens = gpt35.encode( text ).length;
    const gpt4Tokens = gpt4.encode( text ).length;
    gpt35.free();
    gpt4.free();
    expect( gpt35Tokens ).toBe( gpt4Tokens );
  } );
} );