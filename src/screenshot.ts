import type {
  ElementHandle,
  Page,
  PuppeteerLifeCycleEvent,
  ScreenshotOptions,
  SetContentWaitForOptions
} from 'puppeteer';
import handlebars, { compile } from 'handlebars';

import { ContentObject, Encoding, MakeScreenshotParams } from './types';

export async function makeScreenshot<TE extends Encoding | undefined>(
  page: Page,
  { screenshot, beforeScreenshot, waitUntil = 'networkidle0', timeout, handlebarsHelpers, clip, viewport }: MakeScreenshotParams<TE, ContentObject>
) {
  if (viewport) {
    page.setViewport({ height: viewport.height, width: viewport.width });
  }

  if (typeof timeout === 'number') {
    page.setDefaultTimeout(timeout);
  }

  const hasHelpers = !!handlebarsHelpers && typeof handlebarsHelpers === 'object';
  if (hasHelpers) {
    if (Object.values(handlebarsHelpers).every((helper) => typeof helper === 'function')) {
      handlebars.registerHelper(handlebarsHelpers);
    } else {
      throw Error('Some helper is not a valid function');
    }
  }

  if (screenshot?.content || hasHelpers) {
    const template = compile(screenshot.html);
    screenshot.setHTML(template(screenshot.content ?? {}));
  }

  // Puppeteer updated their API to exclude networkidle from setContent - we will now exclude it from setContent
  // and manually run waitForNetworkIdle during these options
  const waitUntilEvents = Array.isArray(waitUntil) ? waitUntil : [waitUntil];
  const contentWaitUntil = waitUntilEvents.filter(
    (event): event is Exclude<PuppeteerLifeCycleEvent, 'networkidle0' | 'networkidle2'> =>
      event !== 'networkidle0' && event !== 'networkidle2'
  );
  const setContentWaitUntil: SetContentWaitForOptions['waitUntil'] = Array.isArray(waitUntil)
    ? contentWaitUntil.length > 0 ? contentWaitUntil : 'domcontentloaded'
    : waitUntil === 'networkidle0' || waitUntil === 'networkidle2'
      ? 'domcontentloaded'
      : waitUntil;

  await page.setContent(screenshot.html, { waitUntil: setContentWaitUntil });

  if (waitUntilEvents.some((event) => event === 'networkidle0' || event === 'networkidle2')) {
    await page.waitForNetworkIdle({
      concurrency: waitUntilEvents.includes('networkidle0') ? 0 : 2,
      idleTime: 500
    });
  }

  const element = await page.$(screenshot.selector);
  if (!element) {
    throw Error('No element matches selector: ' + screenshot.selector);
  }

  let screenshotTarget: Page | ElementHandle<Element> = element;

  if (beforeScreenshot) {
    await beforeScreenshot(page);
  }

  const screenshotOptions: ScreenshotOptions = {
    path: screenshot.output,
    type: screenshot.type,
    omitBackground: screenshot.transparent,
    encoding: screenshot.encoding,
    quality: screenshot.quality
  };

  if (clip?.full) {
    screenshotTarget = page;
    screenshotOptions.fullPage = true;
  } else if (clip?.points) {
    let x = clip.points.x;
    let y = clip.points.y;
    let width = clip.points.width;
    let height = clip.points.height;

    if (!clip.points.absolute?.x || !clip.points.absolute?.y || !clip.points.absolute?.width || !clip.points.absolute?.height) {
      const box = await element.boundingBox();
      if (!box) throw new Error('Element is not visible or attached to DOM.');

      if (!clip.points.absolute?.x) x += box.x;
      if (!clip.points.absolute?.y) y += box.y;
      if (!clip.points.absolute?.width) width += box.width;
      if (!clip.points.absolute?.height) height += box.height;
    }

    screenshotOptions.clip = { height, width, x, y };
  }

  const result = await screenshotTarget.screenshot(screenshotOptions);

  screenshot.setBuffer(typeof result === 'string' ? result : Buffer.from(result));

  return screenshot;
}
