# llm-dsl-chatgpt
a ChatGPT implementation for [@k-apps.io/llm-dsl](https://www.npmjs.com/package/@k-apps.io/llm-dsl)

# Installation
```shell
npm install @k-apps.io/llm-dsl-chatgpt
```

# Usage

```typescript
import { DSL, LocalStorage, Context } from "@k-apps.io/llm-dsl";
import { ChatGPT, Options } from "@k-apps.io/llm-dsl-chatgpt";

require( "dotenv" ).config();

const main = () => {

  const LLM = new ChatGPT( {} );

  const chat = new DSL<Options, Context>( {
    llm: LLM,
    storage: LocalStorage,
    options: {
      model: "gpt-4",
      temperature: 0.5,
      top_p: 0.5
    }
  } );

  chat.prompt( {
      message: "hello"
    } )
    .stream( chunk => {
      if ( chunk.type === "message" ) process.stdout.write( content );
    } )
    .then( () => {
      console.log( "done" );
    } )
    .catch( error => {
      console.error( error );
    } );
};

main();

```