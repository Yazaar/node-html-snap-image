import { ImageType, Encoding, Content, ScreenshotParams, ScreenshotType } from "../types";

export class Screenshot<TE extends Encoding, TC extends Content> {
  output: string;
  content: Content;
  selector: string;
  html: string;
  quality?: number;
  buffer?: ScreenshotType<TE>;
  type?: ImageType;
  encoding?: Encoding;
  transparent?: boolean;

  constructor(params: ScreenshotParams<TE, TC>) {
    if (!params || !params.html) {
      throw Error("You must provide an html property.");
    }

    const {
      html,
      encoding,
      transparent = false,
      output,
      content,
      selector = "body",
      quality = 80,
      type = "png",
    } = params;

    this.html = html;
    this.encoding = encoding;
    this.transparent = transparent;
    this.type = type;
    this.output = output;
    this.content = isEmpty(content) ? undefined : content;
    this.selector = selector;
    this.quality = type === "jpeg" ? quality : undefined;
  }

  setHTML(html: string) {
    if (!html) {
      throw Error("You must provide an html property.");
    }
    this.html = html;
  }

  setBuffer(buffer: Buffer | string) {
    if (this.encoding === 'base64') {
      this.buffer = (typeof buffer === 'string' ? buffer : buffer.toString('base64')) as ScreenshotType<TE>;
    } else {
      this.buffer = (typeof buffer === 'string' ? Buffer.from(buffer) : buffer) as ScreenshotType<TE>;
    }
  }
}

function isEmpty(val: object) {
  return val == null || !Object.keys(val).length;
}
