import { Function, FunctionResponse, LLM, Options as LLMOptions, Message, Stream, TextResponse } from "@k-apps-io/llm-dsl";
import { ClientOptions, OpenAI } from 'openai';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming } from 'openai/resources';
import { Tiktoken, TiktokenModel, encoding_for_model } from 'tiktoken';

interface StreamOptions extends Stream, Omit<ChatCompletionCreateParamsStreaming, "messages" | "stream" | "functions" | "max_tokens"> { }

export interface Options extends LLMOptions, Omit<ChatCompletionCreateParamsNonStreaming, "messages" | "model" | "functions"> { }

interface ChatGPTOptions extends ClientOptions {
  model: TiktokenModel | string;
}

const determineEncoder = ( model: string ): Tiktoken => {
  const match = model.match( /ft:(.+):.+::.+/i );
  if ( match ) {
    model = match[ 1 ] as TiktokenModel;
  }
  return encoding_for_model( model as TiktokenModel );
};

export class ChatGPT extends LLM {
  openapi: OpenAI;
  options: ClientOptions;
  encoder: Tiktoken;
  model: string;

  constructor( options: ChatGPTOptions ) {
    super();
    this.model = options.model;
    if ( typeof options.model !== 'string' ) {
      this.encoder = options.model;
    } else {
      this.encoder = determineEncoder( options.model );
    }
    this.options = options;
    this.openapi = new OpenAI( options );
  }

  tokens( text: string ): number {
    if ( !text ) return 0;
    const tokens = this.encoder.encode( text );
    return tokens.length;
  }

  /**
   * this calculation is based off https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb and 
   * should be treated as an estimate and not a exact calculation
   * 
   * @param {Message[]} window 
   * @returns number
   */
  windowTokens( window: Message[] ): number {
    let tokensPerMessage: number;
    let tokensPerName: number;
    const model = this.model;
    if ( model === "gpt-3.5-turbo-0613" ||
      model === "gpt-3.5-turbo-16k-0613" ||
      model === "gpt-4-0314" ||
      model === "gpt-4-32k-0314" ||
      model === "gpt-4-0613" ||
      model === "gpt-4-32k-0613" ||
      model.includes( "gpt-3.5-turbo" ) ||
      model.includes( "gpt-4" ) ) {
      tokensPerMessage = 3;
      tokensPerName = 1;
    } else if ( model === "gpt-3.5-turbo-0301" ) {
      tokensPerMessage = 4; // every message follows {role/name}\n{content}\n
      tokensPerName = -1; // if there's a name, the role is omitted
    } else {
      throw new Error( `not implemented for model ${ model }.` );
    }

    let numTokens = 0;

    for ( const message of window ) {
      numTokens += tokensPerMessage + message.size;
      if ( Object.keys( message ).includes( "name" ) ) {
        numTokens += tokensPerName;
      }
    }

    numTokens += 3; // every reply is primed with assistant
    return numTokens;
  }

  /**
   * calculation is based off https://stackoverflow.com/questions/77168202/calculating-total-tokens-for-api-request-to-chatgpt-including-functions
   * and should be treated as an estimate and not an exact calculation
   * 
   * @param {Function[]} functions 
   * @returns {{ total: number;[ key: string ]: number; }}
   */
  functionTokens( functions: Function[] ): { total: number;[ key: string ]: number; } {
    if ( functions.length === 0 ) return { total: 0 };
    return functions
      .map( ( { name, description, parameters } ) => {
        let tokenCount = 7; // 7 for each function to start
        tokenCount += this.encoder.encode( `${ name }:${ description }` ).length;
        if ( parameters ) {
          tokenCount += 3;
          Object.keys( parameters.properties ).forEach( key => {
            tokenCount += 3;
            const p_type = parameters.properties[ key ].type;
            const p_desc = parameters.properties[ key ].description;
            if ( p_type === "enum" ) {
              tokenCount += 3;  // Add tokens if property has enum list
              const options: string[] = parameters.properties[ key ].enum;
              options.forEach( ( v: any ) => {
                tokenCount += this.encoder.encode( String( v ) ).length + 3;
              } );
            }
            tokenCount += this.encoder.encode( `${ key }:${ p_type }:${ p_desc }"` ).length;
          } );
        }
        return [ name, tokenCount ] as [ string, number ];
      } ).reduce( ( total, [ name, count ] ) => {
        total[ name ] = count;
        total.total += count;
        return total;
      }, { total: 12 } as { total: number;[ key: string ]: number; } );
  }

  close(): void {
    this.encoder.free();
  }

  async *stream( config: StreamOptions ): AsyncIterable<FunctionResponse | TextResponse> {
    const { messages, functions } = config;

    // build the completion body
    const body: ChatCompletionCreateParamsStreaming = {
      model: config.model || this.model,
      stream: true,
      user: config.user,
      messages: messages.map( m => {
        return {
          content: m.prompt,
          role: m.role,
        };
      } ),
      max_tokens: config.responseSize
    };

    // add the functions if they're defined
    if ( functions !== undefined && functions.length > 0 ) {
      body.functions = functions
        .map( ( { name, description, parameters } ) => ( { name, description, parameters } ) );
    }

    // create the stream
    const stream = await this.openapi.chat.completions.create( body );

    // a function call is similarly streamed like a text response
    //  but handled differently. It's collected until the end of the stream
    //  and then finally yielded once both the name and args are complete
    let functionName: string | null = null;
    let functionArgs: string = "";
    let open: boolean = false;
    for await ( const chunk of stream ) {
      if ( chunk.choices[ 0 ].delta.function_call ) {
        open = true;
        // we have a function call
        const call = chunk.choices[ 0 ].delta.function_call;
        // set the name if it's defined
        if ( call.name ) functionName = call.name;
        // build up the args
        functionArgs += call.arguments || "";
      } else {
        if ( open ) {
          yield { type: "function", name: functionName!, arguments: functionArgs };
          // reset
          open = false;
          functionName = null;
          functionArgs = "";
        }
        const content = chunk.choices[ 0 ].delta?.content || '';
        yield { content: content, type: "text" };
      }
    }
    // flush
    if ( open ) {
      yield { type: "function", name: functionName!, arguments: functionArgs };
    }
  }
}