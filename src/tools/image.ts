import { LLM } from "@k-apps-io/llm-dsl";
import OpenAI from "openai";
import sharp from "sharp";
import { Options, Prompts, Responses, ToolResults } from "../ChatGPT";

export const generate: LLM.Tool.Tool<Options, Prompts, Responses, ToolResults> =
  {
    name: "generate",
    description: "Generate an image based on a prompt.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt to generate the image from.",
          example:
            "Generate an image of a futuristic cityscape at night with neon lights.",
        },
        n: {
          type: "integer",
          description: "The number of images to generate.",
          example: 1,
        },
        size: {
          type: "string",
          description: "The size of the generated image.",
          example: "1024x1024",
        },
        quality: {
          type: "string",
          description: "The quality of the generated image",
          enum: ["standard", "hd"],
          default: "standard",
        },
        style: {
          type: "string",
          description: "The style of the generated image",
          enum: ["vivid", "natural"],
          default: "vivid",
        },
        response_format: {
          type: "string",
          description: "The format of the response",
          enum: ["url", "b64_json"],
          default: "url",
        },
      },
      required: ["prompt", "n", "size"],
    },
    func: ({ prompt, n = 1, size = "1024x1024", tool_call_id }) => {
      return new Promise<ToolResults>((resolve, reject) => {
        const openai = new OpenAI();
        openai.images
          .generate({
            prompt,
            n,
            size,
          })
          .then(({ data }) => {
            if (!data) {
              resolve({
                role: "tool",
                tool_call_id: tool_call_id!,
                content: [
                  {
                    type: "text",
                    text: "No image generated.",
                  },
                ],
              });
            } else {
              resolve({
                role: "tool",
                tool_call_id: tool_call_id!,
                content: data.map((image) => ({
                  type: "text",
                  text: `Generated image URL: ${image.url}`,
                })),
              });
            }
          })
          .catch((error) => {
            resolve({
              role: "tool",
              tool_call_id: tool_call_id!,
              content: [
                {
                  type: "text",
                  text: `Error generating image: ${error.message}`,
                },
              ],
            });
          });
      });
    },
  };

export const modify: LLM.Tool.Tool<Options, Prompts, Responses, ToolResults> = {
  name: "modify",
  description: "Modify an existing image based on a prompt.",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "The URL of the image to modify.",
        example: "https://example.com/image.png",
      },
      prompt: {
        type: "string",
        description: "The prompt to modify the image with.",
        example: "Add a sunset in the background.",
      },
      n: {
        type: "integer",
        description: "The number of modified images to generate.",
        example: 1,
      },
      size: {
        type: "string",
        description: "The size of the modified image.",
        example: "1024x1024",
      },
      mask_url: {
        type: "string",
        description: "URL of the mask image to specify which areas to edit",
        example: "https://example.com/mask.png",
      },
      quality: {
        type: "string",
        description: "The quality of the modified image",
        enum: ["standard", "hd"],
        default: "standard",
      },
    },
    required: ["image_url", "prompt", "n", "size"],
  },
  func: ({ image_url, prompt, n = 1, size = "1024x1024", tool_call_id }) => {
    return new Promise<ToolResults>((resolve, reject) => {
      const openai = new OpenAI();
      openai.images
        .edit({
          image: image_url,
          prompt,
          n,
          size,
        })
        .then(({ data }) => {
          if (!data) {
            resolve({
              role: "tool",
              tool_call_id: tool_call_id!,
              content: [
                {
                  type: "text",
                  text: "No image modified.",
                },
              ],
            });
          } else {
            resolve({
              role: "tool",
              tool_call_id: tool_call_id!,
              content: data.map((image) => ({
                type: "text",
                text: `Modified image URL: ${image.url}`,
              })),
            });
          }
        })
        .catch((error) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Error modifying image: ${error.message}`,
              },
            ],
          });
        });
    });
  },
};

export const save: LLM.Tool.Tool<
  Options,
  Prompts,
  Responses,
  ToolResults,
  any,
  any,
  { image_url: string }
> = {
  name: "save",
  description: "Save a generated or modified image for the user.",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "The URL of the image to save.",
        example: "https://example.com/image.png",
      },
    },
    required: ["image_url"],
  },
  func: ({ chat, image_url, tool_call_id }) => {
    return new Promise<ToolResults>((resolve, reject) => {
      // download the image from the URL
      fetch(image_url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          return response.blob();
        })
        .then((blob) => blob.arrayBuffer())
        .then((buffer) => {
          const content = Buffer.from(buffer);
          chat.storage
            .createArtifact({ content })
            .then((artifact) => {
              resolve({
                role: "tool",
                tool_call_id: tool_call_id!,
                content: [
                  {
                    type: "text",
                    text: `Image saved successfully as as ${artifact.id}. You can access it in your storage.`,
                  },
                ],
              });
            })
            .catch((error) => {
              resolve({
                role: "tool",
                tool_call_id: tool_call_id!,
                content: [
                  {
                    type: "text",
                    text: `Error saving image: ${error.message}`,
                  },
                ],
              });
            });
        });
    });
  },
};

export const resize: LLM.Tool.Tool<Options, Prompts, Responses, ToolResults> = {
  name: "resize",
  description: "Resize an image with optional formatting",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "The URL of the image to resize",
        example: "https://example.com/image.png",
      },
      width: {
        type: "integer",
        description: "Target width in pixels",
      },
      height: {
        type: "integer",
        description: "Target height in pixels",
      },
      fit: {
        type: "string",
        description: "How to fit the image",
        enum: ["cover", "contain", "fill", "inside", "outside"],
        default: "cover",
      },
      format: {
        type: "string",
        description: "Output format",
        enum: ["jpeg", "png", "webp", "avif"],
        default: "jpeg",
      },
    },
    required: ["image_url", "width", "height"],
  },
  func: ({
    chat,
    image_url,
    width,
    height,
    fit = "cover",
    format = "jpeg",
    tool_call_id,
  }) => {
    return new Promise<ToolResults>((resolve) => {
      fetch(image_url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          return sharp(Buffer.from(buffer))
            .resize(width, height, { fit })
            .toFormat(format)
            .toBuffer();
        })
        .then((outputBuffer) => {
          return chat.storage.createArtifact({ content: outputBuffer });
        })
        .then((artifact) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Image resized and saved as ${artifact.id}`,
              },
            ],
          });
        })
        .catch((error) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Error resizing image: ${error.message}`,
              },
            ],
          });
        });
    });
  },
};

export const transform: LLM.Tool.Tool<
  Options,
  Prompts,
  Responses,
  ToolResults
> = {
  name: "transform",
  description: "Apply transformations to an image",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "The URL of the image to transform",
      },
      rotate: {
        type: "integer",
        description: "Rotation angle in degrees",
      },
      flip: {
        type: "boolean",
        description: "Flip horizontally",
      },
      flop: {
        type: "boolean",
        description: "Flip vertically",
      },
      blur: {
        type: "number",
        description: "Gaussian blur sigma",
      },
      sharpen: {
        type: "boolean",
        description: "Apply sharpening",
      },
    },
    required: ["image_url"],
  },
  func: ({
    chat,
    image_url,
    rotate,
    flip,
    flop,
    blur,
    sharpen,
    tool_call_id,
  }) => {
    return new Promise<ToolResults>((resolve) => {
      fetch(image_url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          let pipeline = sharp(Buffer.from(buffer));
          if (rotate) pipeline = pipeline.rotate(rotate);
          if (flip) pipeline = pipeline.flip();
          if (flop) pipeline = pipeline.flop();
          if (blur) pipeline = pipeline.blur(blur);
          if (sharpen) pipeline = pipeline.sharpen();
          return pipeline.toBuffer();
        })
        .then((outputBuffer) => {
          return chat.storage.createArtifact({ content: outputBuffer });
        })
        .then((artifact) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Image transformed and saved as ${artifact.id}`,
              },
            ],
          });
        })
        .catch((error) => {
          resolve({
            role: "tool",
            tool_call_id: tool_call_id!,
            content: [
              {
                type: "text",
                text: `Error transforming image: ${error.message}`,
              },
            ],
          });
        });
    });
  },
};

export const suite: LLM.Tool.Suite<Options, Prompts, Responses, ToolResults> = {
  name: "image",
  tools: [generate, modify, save, resize, transform],
};
