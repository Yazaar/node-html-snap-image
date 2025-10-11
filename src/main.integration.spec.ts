import { existsSync, mkdirSync, readdirSync } from "fs";
import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import * as rimraf from "rimraf";
import { createWorker } from "tesseract.js";

import { nodeHtmlToImage } from "./main";

describe("node-html-to-image", () => {
  beforeEach(() => {
    rimraf.sync("./generated");
    mkdirSync("./generated");
  });

  afterAll(() => {
    rimraf.sync("./generated");
  });
  describe("error", () => {
    it("should throw due to invalid quality parameter", async () => {
      await expect(async () => {
        await nodeHtmlToImage({
          html: "<html></html>",
          type: "jpeg",
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          quality: "wrong value",
          puppeteerArgs: { args: ['--no-sandbox'] }
        });
      }).rejects.toThrow();
    });
  });

  describe("single image", () => {
    it("should generate output file and return Buffer", async () => {
      const imageBuffer = await nodeHtmlToImage({
        output: "./generated/image.png",
        html: "<html></html>",
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(existsSync("./generated/image.png")).toBe(true);
      expect(imageBuffer).toBeInstanceOf(Buffer);
    });

    it("should return a buffer", async () => {
      const result = await nodeHtmlToImage({
        html: "<html></html>",
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should return a base64 string", async () => {
      const result = await nodeHtmlToImage({
        html: "<html></html>",
        encoding: "base64",
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(typeof result).toBe('string');
    });

    it("should throw an error if html is not provided", async () => {
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await nodeHtmlToImage({
          output: "./generated/image.png",
          puppeteerArgs: { args: ['--no-sandbox'] }
        });
      }).rejects.toThrow("You must provide an html property.");
    });

    it("should throw timeout error", async () => {
      await expect(async () => {
        await nodeHtmlToImage({
          timeout: 500,
          html: "<html></html>",
          puppeteerArgs: { args: ['--no-sandbox'] }
        });
      }).rejects.toThrow("Timeout hit: 500");
    });

    it("should generate an jpeg image and return Buffer", async () => {
      const imageBuffer = await nodeHtmlToImage({
        output: "./generated/image.jpg",
        html: "<html></html>",
        type: "jpeg",
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(existsSync("./generated/image.jpg")).toBe(true);
      expect(imageBuffer).toBeInstanceOf(Buffer);
    });

    it("should put html in output file", async () => {
      await nodeHtmlToImage({
        output: "./generated/image.png",
        html: "<html><body>Hello world!</body></html>",
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      const text = await getTextFromImage("./generated/image.png");
      expect(text.trim()).toBe("Hello world!");
    });

    it("should use handlebars to customize content", async () => {
      await nodeHtmlToImage({
        output: "./generated/image.png",
        html: "<html><body>Hello {{name}}!</body></html>",
        content: { name: "Yvonnick" },
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      const text = await getTextFromImage("./generated/image.png");
      expect(text.trim()).toBe("Hello Yvonnick!");
    });

    it("should create selected element image", async () => {
      await nodeHtmlToImage({
        output: "./generated/image.png",
        html: '<html><body>Hello <div id="section">{{name}}!</div></body></html>',
        content: { name: "Sangwoo" },
        selector: "div#section",
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      const text = await getTextFromImage("./generated/image.png");
      expect(text.trim()).toBe("Sangwoo!");
    });
  });

  describe("batch", () => {
    it("should create two images and return two Buffers", async () => {
      const imageBuffers = await nodeHtmlToImage({
        type: "png",
        quality: 300,
        html: "<html><body>Hello {{name}}!</body></html>",
        content: [
          { name: "Yvonnick", output: "./generated/image1.png" },
          { name: "World", output: "./generated/image2.png" },
        ],
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(imageBuffers?.length).toBe(2);

      const buffer1 = imageBuffers?.[0];
      const buffer2 = imageBuffers?.[1];

      expect(buffer1).toBeInstanceOf(Buffer);
      expect(buffer2).toBeInstanceOf(Buffer);

      const text1 = await getTextFromImage("./generated/image1.png");
      expect(text1.trim()).toBe("Hello Yvonnick!");

      const text2 = await getTextFromImage("./generated/image2.png");
      expect(text2.trim()).toBe("Hello World!");
    });

    it("should return two buffers", async () => {
      const result = await nodeHtmlToImage({
        type: "png",
        quality: 300,
        html: "<html><body>Hello {{name}}!</body></html>",
        content: [{ name: "Yvonnick" }, { name: "World" }],
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(result?.[0]).toBeInstanceOf(Buffer);
      expect(result?.[1]).toBeInstanceOf(Buffer);
    });

    it("should create selected elements images", async () => {
      await nodeHtmlToImage({
        html: '<html><body>Hello <div id="section1">{{name}}!</div><div id="section2">World!</div></body></html>',
        content: [
          {
            name: "Sangwoo",
            output: "./generated/image1.png",
            selector: "div#section1",
          },
          { output: "./generated/image2.png", selector: "div#section2" },
        ],
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      const text1 = await getTextFromImage("./generated/image1.png");
      expect(text1.trim()).toBe("Sangwoo!");
      const text2 = await getTextFromImage("./generated/image2.png");
      expect(text2.trim()).toBe("World!");
    });

    it.skip("should handle mass volume well", async () => {
      jest.setTimeout(60000 * 60);
      expect.hasAssertions();
      const NUMBER_OF_IMAGES = 2000;
      const content = Array.from(Array(NUMBER_OF_IMAGES), (_, i) => ({
        name: i,
        output: `./generated/${i}.jpg`,
      }));

      await nodeHtmlToImage({
        type: "png",
        quality: 300,
        html: "<html><body>Hello {{name}}!</body></html>",
        content,
        puppeteerArgs: { args: ['--no-sandbox'] }
      });

      expect(readdirSync("./generated")).toHaveLength(NUMBER_OF_IMAGES);
    });
  });
  describe("different instance", () => {
    it("should pass puppeteer instance and generate image", async () => {
      const executablePath = puppeteer.executablePath();

      await nodeHtmlToImage({
        output: "./generated/image.png",
        html: "<html></html>",
        puppeteerArgs: { executablePath, args: ['--no-sandbox'] },
        puppeteer: puppeteerCore,
      });

      expect(existsSync("./generated/image.png")).toBe(true);
    });

    it("should throw an error if executablePath is not provided", async () => {
      await expect(async () => {
        await nodeHtmlToImage({
          output: "./generated/image.png",
          html: "<html></html>",
          puppeteer: puppeteerCore,
        });
      }).rejects.toThrow();
    });
  });
});

async function getTextFromImage(path: string) {
  const worker = await createWorker();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const {
    data: { text },
  } = await worker.recognize(path);
  await worker.terminate();

  return text;
}
