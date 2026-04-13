// Simple Node.js script to convert SRT to VTT
// Usage: node convert-srt-to-vtt.js Ep\ 1.srt

const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.log('Usage: node convert-srt-to-vtt.js <file.srt>');
  process.exit(1);
}

const srtPath = process.argv[2];
const vttPath = srtPath.replace(/\.srt$/i, '.vtt');

let srt = fs.readFileSync(srtPath, 'utf8');

// Convert SRT to VTT format
let vtt = 'WEBVTT\n\n' +
  srt
    .replace(/\r/g, '')
    .replace(/(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g, '$2 --> $3')
    .replace(/,/g, '.');

fs.writeFileSync(vttPath, vtt, 'utf8');
console.log('Converted', srtPath, 'to', vttPath);
