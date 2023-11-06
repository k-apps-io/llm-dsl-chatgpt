import { FunctionResponse, LLM, Options as LLMOptions, Stream, TextResponse } from "@k-apps.io/llm-dsl";
import { ClientOptions, OpenAI } from 'openai';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming } from 'openai/resources';
import { encoding_for_model } from 'tiktoken';

interface StreamOptions extends Stream, Omit<ChatCompletionCreateParamsStreaming, "messages" | "stream" | "functions"> { }

export interface Options extends LLMOptions, Omit<ChatCompletionCreateParamsNonStreaming, "messages"> { }

export class ChatGPT extends LLM {
  openapi: OpenAI;
  options: ClientOptions;

  constructor( options: ClientOptions ) {
    super();
    this.options = options;
    this.openapi = new OpenAI( options );
  }

  tokens( text: string ): number {
    const enc = encoding_for_model( "gpt-4" );
    const tokens = enc.encode( text );
    enc.free();
    return tokens.length;
  }

  async *stream( config: StreamOptions ): AsyncIterable<FunctionResponse | TextResponse> {
    const { messages, functions } = config;

    // build the completion body
    const body: ChatCompletionCreateParamsStreaming = {
      model: config.model,
      stream: true,
      user: config.user,
      messages: messages.map( m => {
        return {
          content: m.prompt,
          role: m.role,
        };
      } ),
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
    for await ( const chunk of stream ) {
      if ( chunk.choices[ 0 ].delta.function_call ) {
        // we have a function call
        const call = chunk.choices[ 0 ].delta.function_call;
        // set the name if it's defined
        if ( call.name ) functionName = call.name;
        // build up the args
        functionArgs += call.arguments || "";
      } else {
        const content = chunk.choices[ 0 ].delta?.content || '';
        yield { content: content, type: "text" };
      }
    }
    if ( functionName !== null ) {
      yield { type: "function", name: functionName!, arguments: functionArgs };
    }
  }
}