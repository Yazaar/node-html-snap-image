import type { Page, PuppeteerLifeCycleEvent, PuppeteerNodeLaunchOptions } from "puppeteer";
import type { Screenshot } from "./models/Screenshot";

// Content (ContentObject + ContentArrayItem) declares the possible formatting of the content object
export type ContentObject = Record<string, unknown>;
export type ContentArrayItem = {
  output?: string;
  selector?: string;
} & Record<string, unknown>;
export type Content = ContentObject | ContentArrayItem[];

// Declares the type definitions of the captured image(s)
export type Encoding = "base64" | "binary";
export type ImageType = "png" | "jpeg";

// Declares a mapping between response type and input types for captured images according to encoding type
// Encoding base64 is a base64 string, 'binary' is a Buffer, and if none is specified 'binary' is default (Buffer)
export type ScreenshotType<TE extends Encoding> = TE extends undefined ? Buffer : TE extends 'base64' ? string : Buffer;

// TQ = array check, TA = resulting array type if TQ is an array, TO = resulting type if TQ isn't an array
export type ConditionalArray<TQ, TA, TO> = TQ extends undefined ? TO : TQ extends Array<unknown> ? TA[] : TO;

// Helper for the ContentArrayItem specifically since it has optional keys important for the image capture procedure
// Ensures that the array type shows the default 'output' and 'selector' keys in code editors but simply returns
// self (the declared object) if it isn't of type Array since these special keys then are taken from the parent object
type EnsureArrayKeys<TA, TD> = TA extends (infer U)[] ? (U & TD)[] : TA;

// Declares the parameters of the screenshot and automatically enables tracking according to declared TE (TypeEncoding) and TC (TypeContent)
// TE and TC used for tracking since these key-values changes the response image type (TE = string/Buffer, TC = object or object[])
export interface ScreenshotParams<TE extends Encoding, TC extends Content> {
  html: string;
  encoding?: TE;
  transparent?: boolean;
  type?: ImageType;
  quality?: number;
  selector?: string;
  content?: EnsureArrayKeys<TC, ContentArrayItem>;
  output?: string;
}

// Options for the Puppeteer cluster and also extends in the parameters for t he screenshot processing
export interface Options<TE extends Encoding, TC extends Content> extends ScreenshotParams<TE, TC>, Omit<MakeScreenshotParams<TE, TC>, 'screenshot'> {
  puppeteerArgs?: PuppeteerNodeLaunchOptions;
  // https://github.com/thomasdondorf/puppeteer-cluster/blob/b5b098aed84b8d2c170b3f9d0ac050f53582df45/src/Cluster.ts#L30
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  puppeteer?: any,
}

// Options for the underlying function which process the process and capture a single image via Puppeteer
export interface MakeScreenshotParams<TE extends Encoding, TC extends Content> {
  screenshot: Screenshot<TE, TC>;
  waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
  beforeScreenshot?: (page: Page) => void | Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlebarsHelpers?: { [helpers: string]: (...args: any[]) => any };

  timeout?: number
}
