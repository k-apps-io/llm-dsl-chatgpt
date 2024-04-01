import { FunctionResponse, LLM, Options as LLMOptions, Stream, TextResponse } from "@k-apps-io/llm-dsl";
import { ClientOptions, OpenAI } from 'openai';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming } from 'openai/resources';
import { TiktokenModel, encoding_for_model } from 'tiktoken';

interface StreamOptions extends Stream, Omit<ChatCompletionCreateParamsStreaming, "messages" | "stream" | "functions" | "max_tokens"> { }

export interface Options extends LLMOptions, Omit<ChatCompletionCreateParamsNonStreaming, "messages" | "model" | "functions"> { }

interface ChatGPTOptions extends ClientOptions {
  model: TiktokenModel | string;
}

const determineEncoder = ( model: string ): TiktokenModel => {
  const match = model.match( /ft:(.+):.+::.+/i );
  if ( match ) {
    return match[ 1 ] as TiktokenModel;
  }
  return model as TiktokenModel;
};

export class ChatGPT extends LLM {
  openapi: OpenAI;
  options: ClientOptions;
  encoder: TiktokenModel;

  constructor( options: ChatGPTOptions ) {
    super();
    if ( typeof options.model !== 'string' ) {
      this.encoder = options.model;
    } else {
      // determine the encoder
      this.encoder = determineEncoder( options.model );
    }
    this.options = options;
    this.openapi = new OpenAI( options );
  }

  tokens( text: string ): number {
    if ( !text ) return 0;
    const enc = encoding_for_model( this.encoder );
    const tokens = enc.encode( text );
    enc.free();
    return tokens.length;
  }

  async *stream( config: StreamOptions ): AsyncIterable<FunctionResponse | TextResponse> {
    const { messages, functions } = config;

    // build the completion body
    const body: ChatCompletionCreateParamsStreaming = {
      model: config.model || this.encoder,
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