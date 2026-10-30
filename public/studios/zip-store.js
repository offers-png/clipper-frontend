// Minimal uncompressed ZIP writer for a handful of already-compressed images.
const CRC_TABLE = Array.from({length: 256}, (_, n) => {
 let c = n;
 for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
 return c >>> 0;
});

export function crc32(bytes) {
 let c = 0xFFFFFFFF;
 for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
 return (c ^ 0xFFFFFFFF) >>> 0;
}

// files: [{name, bytes: Uint8Array}] -> Uint8Array of a .zip
export function makeZip(files) {
 const encoder = new TextEncoder(), local = [], central = [];
 let offset = 0;
 for (const {name, bytes} of files) {
  const nameBytes = encoder.encode(name), crc = crc32(bytes);
  const header = new DataView(new ArrayBuffer(30));
  header.setUint32(0, 0x04034B50, true); header.setUint16(4, 20, true); header.setUint16(6, 0x0800, true);
  header.setUint32(14, crc, true); header.setUint32(18, bytes.length, true); header.setUint32(22, bytes.length, true);
  header.setUint16(26, nameBytes.length, true);
  local.push(new Uint8Array(header.buffer), nameBytes, bytes);
  const entry = new DataView(new ArrayBuffer(46));
  entry.setUint32(0, 0x02014B50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint16(8, 0x0800, true);
  entry.setUint32(16, crc, true); entry.setUint32(20, bytes.length, true); entry.setUint32(24, bytes.length, true);
  entry.setUint16(28, nameBytes.length, true); entry.setUint32(42, offset, true);
  central.push(new Uint8Array(entry.buffer), nameBytes);
  offset += 30 + nameBytes.length + bytes.length;
 }
 const size = central.reduce((total, part) => total + part.length, 0);
 const end = new DataView(new ArrayBuffer(22));
 end.setUint32(0, 0x06054B50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
 end.setUint32(12, size, true); end.setUint32(16, offset, true);
 const parts = [...local, ...central, new Uint8Array(end.buffer)];
 const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
 let at = 0;
 for (const part of parts) { out.set(part, at); at += part.length; }
 return out;
}

export function fileSlug(text) {
 return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'thumbnail';
}
