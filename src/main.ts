import { Cluster } from "puppeteer-cluster";

import { Screenshot } from "./models/Screenshot";
import { makeScreenshot } from "./screenshot";
import { Encoding, ScreenshotType, Options, ScreenshotParams, Content, ConditionalArray, ContentArrayItem, ContentObject } from "./types";

/**
 * Generates an image (or images) from HTML using Puppeteer, optionally supporting batch processing.
 *
 * @template TE - The encoding type mapped by 'encoding' parameter. Base64 or binary. Default: binary (undefined).
 * @template TC - The content type mapped by 'content' parameter. This is either an object or object[].
 * @param options - Configuration options for HTML rendering and screenshot generation.
 * @param options.html - The HTML string to render.
 * @param options.encoding - The encoding for the output image(s).
 * @param options.transparent - Whether the background should be transparent.
 * @param options.content - Content data or array of content data for batch processing.
 * @param options.output - Output file path if content is an object. Else define output within the Content object[].
 * @param options.selector - CSS selector to target a specific element for the screenshot if content is an object. Else declare the selector within the Content object[].
 * @param options.type - The image format. Options: 'png' (default), 'jpeg'
 * @param options.quality - The image quality (for JPEG).
 * @param options.puppeteerArgs - Puppeteer configuration options.
 * @param options.timeout - Timeout for Puppeteer operations in MS (default: 30000ms/30s).
 * @param options.puppeteer - Use a custom puppeteer library (i.e puppeteer-core or puppeteer-extra)
 * @returns String (base64) or Buffer (binary) depending on encoding type. If content is an array it will return an array instead of single a string or Buffer.
 */
export async function nodeHtmlToImage<TE extends Encoding | undefined = undefined, TC extends Content | undefined = undefined>(options: Options<TE, TC>): Promise<ConditionalArray<TC, ScreenshotType<TE>, ScreenshotType<TE>>> {
  const {
    html,
    encoding,
    transparent,
    content,
    output,
    selector,
    type,
    quality,
    puppeteerArgs = {},
    timeout = 30000,
    puppeteer = undefined,
  } = options;

  const cluster: Cluster<ScreenshotParams<TE, ContentObject>> = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
    timeout,
    puppeteerOptions: { ...puppeteerArgs, headless: "shell" },
    puppeteer: puppeteer,
  });

  const shouldBatch = Array.isArray(content);
  const contents = (shouldBatch ? content : [{ ...content, output, selector }]) as ContentArrayItem[];

  try {
    const screenshots: Array<Screenshot<TE, TC>> = await Promise.all(
      contents.map((content) => {
        const { output, selector: contentSelector, ...pageContent } = content;
        return cluster.execute(
          {
            html,
            encoding,
            transparent,
            output,
            content: pageContent,
            selector: contentSelector ? contentSelector : selector,
            type,
            quality,
          },
          async ({ page, data }) => {
            const screenshot = await makeScreenshot(page, {
              ...options,
              screenshot: new Screenshot<TE, ContentObject>(data),
            });
            return screenshot;
          },
        );
      }),
    );
    await cluster.idle();
    await cluster.close();

    return (shouldBatch
      ? screenshots.map(({ buffer }) => buffer)
      : screenshots[0].buffer) as ConditionalArray<TC, ScreenshotType<TE>, ScreenshotType<TE>>;
  } catch (err) {
    await cluster.close();
    throw err;
  }
}
