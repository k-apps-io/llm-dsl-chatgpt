# llm-dsl-chatgpt
a ChatGPT implementation for [@k-apps-io/llm-dsl](https://www.npmjs.com/package/@k-apps-io/llm-dsl)

# Installation
```shell
npm install @k-apps-io/llm-dsl @k-apps-io/llm-dsl-chatgpt
```

# Usage

```typescript
import { DSL, LocalStorage, Context } from "@k-apps-io/llm-dsl";
import { ChatGPT, Options } from "@k-apps-io/llm-dsl-chatgpt";

require( "dotenv" ).config();

const main = () => {

  const LLM = new ChatGPT( { model: "gpt-3.5-turbo" } );

  const chat = new DSL<Options, Context>( {
    llm: LLM
  } );

  chat
    .prompt( {
      message: "hello"
    } )
    .stream( stdout() )
    .then( () => {
      console.log( "done" );
    } )
    .catch( error => {
      console.error( error );
    } );
};

main();

```

# More

See the docs for [@k-apps-io/llm-dsl](https://www.npmjs.com/package/@k-apps-io/llm-dsl)