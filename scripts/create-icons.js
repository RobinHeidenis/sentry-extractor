#!/usr/bin/env node

/**
 * Simple PNG generator without external dependencies
 * Creates solid color icons for the extension
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 calculation for PNG chunks
function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Create a PNG chunk
function createChunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  
  const crcData = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  
  return Buffer.concat([length, typeBytes, data, crc]);
}

// Create a simple PNG with a gradient-like pattern
function createPNG(size) {
  // IHDR chunk data
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr.writeUInt8(8, 8);        // bit depth
  ihdr.writeUInt8(2, 9);        // color type (RGB)
  ihdr.writeUInt8(0, 10);       // compression
  ihdr.writeUInt8(0, 11);       // filter
  ihdr.writeUInt8(0, 12);       // interlace

  // Create image data (RGB pixels with filter byte per row)
  const rowSize = 1 + size * 3; // filter byte + RGB
  const imageData = Buffer.alloc(rowSize * size);
  
  // Colors for gradient: #362F78 to #5B4B9E
  const color1 = { r: 0x36, g: 0x2F, b: 0x78 };
  const color2 = { r: 0x5B, g: 0x4B, b: 0x9E };
  
  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    imageData[rowOffset] = 0; // No filter
    
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      const r = Math.round(color1.r + (color2.r - color1.r) * t);
      const g = Math.round(color1.g + (color2.g - color1.g) * t);
      const b = Math.round(color1.b + (color2.b - color1.b) * t);
      
      const pixelOffset = rowOffset + 1 + x * 3;
      imageData[pixelOffset] = r;
      imageData[pixelOffset + 1] = g;
      imageData[pixelOffset + 2] = b;
    }
  }
  
  // Compress with zlib
  const compressed = zlib.deflateSync(imageData);
  
  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'icons');

// Generate icons
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const png = createPNG(size);
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`Created ${filename}`);
});

console.log('All icons created successfully!');

