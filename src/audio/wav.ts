/**
 * WAV (seção 7.5): escrevemos PCM de 16 bits mono e lemos PCM de 16 bits ou float de 32 bits,
 * mono ou estéreo (misturado em mono).
 */

export type DecodedWav = { samples: Float32Array; sampleRate: number };

const HEADER_SIZE = 44;

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(HEADER_SIZE + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeTag = (offset: number, tag: string) => {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, tag.charCodeAt(i));
  };

  writeTag(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  view.setUint32(16, 16, true); // tamanho do bloco fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes por segundo
  view.setUint16(32, 2, true); // bytes por amostra
  view.setUint16(34, 16, true); // bits
  writeTag(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(HEADER_SIZE + i * 2, Math.round(clamped * 32767), true);
  }
  return bytes;
}

export function decodeWav(bytes: Uint8Array): DecodedWav {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Arquivo não é WAV');

  let format = 0;
  let channels = 1;
  let sampleRate = 0;
  let bits = 0;
  let offset = 12;
  // Percorre os blocos: pode haver outros (ex.: LIST) antes do "data".
  while (offset + 8 <= bytes.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      const end = Math.min(body + size, bytes.length);
      return { samples: readSamples(view, body, end, format, bits, channels), sampleRate };
    }
    offset = body + size + (size % 2);
  }
  throw new Error('WAV sem áudio');
}

function readSamples(view: DataView, start: number, end: number, format: number, bits: number, channels: number) {
  const isFloat = format === 3 && bits === 32;
  if (!isFloat && !(format === 1 && bits === 16)) throw new Error('Formato de WAV não suportado');
  const bytesPerSample = bits / 8;
  const count = Math.floor((end - start) / (bytesPerSample * channels));
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const at = start + (i * channels + c) * bytesPerSample;
      sum += isFloat ? view.getFloat32(at, true) : view.getInt16(at, true) / 32768;
    }
    out[i] = sum / channels;
  }
  return out;
}
