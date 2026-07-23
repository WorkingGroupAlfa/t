/* Builds 1280px WebP derivatives through Chromium's native image decoder/encoder. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const endpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9223';
const pageUrl = process.env.PAGE_URL || 'http://127.0.0.1:4173/';
const rootDir = path.resolve(__dirname, '..');
const images = [
  { source: 'uploads/clouds.webp', output: 'uploads/clouds-mobile.webp' },
  { source: 'uploads/homes.webp', output: 'uploads/homes-mobile.webp' }
];
let sequence = 0;

async function main() {
  const targets = await fetch(endpoint + '/json/list').then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  if (!target) throw new Error('No Chromium page target found');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: pageUrl });
  await new Promise((resolve) => setTimeout(resolve, 900));

  for (const image of images) {
    const result = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function () {
        const response = await fetch(${JSON.stringify(new URL(image.source, pageUrl).href)});
        if (!response.ok) throw new Error('Image fetch failed: ' + response.status);
        const bitmap = await createImageBitmap(await response.blob());
        const width = 1280;
        const height = Math.round(bitmap.height * width / bitmap.width);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .84));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 32768) {
          binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 32768));
        }
        return { width, height, base64: btoa(binary), size: bytes.length };
      })()`
    });
    if (result.exceptionDetails || !result.result || !result.result.value) {
      throw new Error('Could not resize ' + image.source);
    }
    const value = result.result.value;
    fs.writeFileSync(path.join(rootDir, image.output), Buffer.from(value.base64, 'base64'));
    console.log(`${image.output}: ${value.width}x${value.height}, ${value.size} bytes`);
  }
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
