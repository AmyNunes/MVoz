/**
 * Do microfone aos quadros de análise (seção 7.1).
 * O Android entrega blocos de ~100 ms em PCM de 16 bits. Convertemos para float (−1 a 1),
 * reamostramos para 16 kHz se o aparelho não gravar nessa taxa e cortamos em quadros de
 * 1024 amostras (64 ms) a cada 320 (20 ms): 50 medidas por segundo.
 */

export const ANALYSIS_SAMPLE_RATE = 16_000;
export const FRAME_SIZE = 1024;
export const HOP_SIZE = 320;

/** PCM de 16 bits (little-endian, como o Android e o WAV usam) → float entre −1 e 1, em mono. */
export function pcm16ToFloat32(data: ArrayBuffer, channels = 1): Float32Array {
  const pcm = new Int16Array(data, 0, Math.floor(data.byteLength / 2));
  const length = Math.floor(pcm.length / channels);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += pcm[i * channels + c];
    out[i] = sum / channels / 32768;
  }
  return out;
}

/**
 * Junta os blocos que chegam e entrega quadros sobrepostos.
 * O quadro passado para `onFrame` é reaproveitado: use-o na hora, sem guardar a referência.
 */
export class FrameBuffer {
  private buffer: Float32Array;
  private length = 0;
  /** Posição (em amostras desde o início) de `buffer[0]`. */
  private offset = 0;
  private readonly frame: Float32Array;

  constructor(
    private readonly sampleRate = ANALYSIS_SAMPLE_RATE,
    private readonly frameSize = FRAME_SIZE,
    private readonly hopSize = HOP_SIZE,
  ) {
    this.buffer = new Float32Array(frameSize * 4);
    this.frame = new Float32Array(frameSize);
  }

  /** `t` = segundos desde o início, no centro do quadro. */
  push(block: Float32Array, onFrame: (frame: Float32Array, t: number) => void): void {
    this.ensureCapacity(this.length + block.length);
    this.buffer.set(block, this.length);
    this.length += block.length;

    let start = 0;
    while (this.length - start >= this.frameSize) {
      this.frame.set(this.buffer.subarray(start, start + this.frameSize));
      onFrame(this.frame, (this.offset + start + this.frameSize / 2) / this.sampleRate);
      start += this.hopSize;
    }
    this.buffer.copyWithin(0, start, this.length);
    this.length -= start;
    this.offset += start;
  }

  reset(): void {
    this.length = 0;
    this.offset = 0;
  }

  private ensureCapacity(size: number): void {
    if (size <= this.buffer.length) return;
    const bigger = new Float32Array(Math.max(size, this.buffer.length * 2));
    bigger.set(this.buffer.subarray(0, this.length));
    this.buffer = bigger;
  }
}

const KERNEL_RESOLUTION = 512;

/** Filtros já calculados, por taxa de entrada/saída (o cálculo usa milhares de senos). */
const kernelCache = new Map<string, { halfWidth: number; kernel: Float32Array }>();

function sincKernel(fromRate: number, toRate: number, zeroCrossings: number) {
  const key = `${fromRate}:${toRate}:${zeroCrossings}`;
  const cached = kernelCache.get(key);
  if (cached) return cached;

  // Corte um pouco abaixo da metade da taxa menor, para a faixa de transição.
  const cutoff = 0.5 * Math.min(1, toRate / fromRate) * 0.9;
  const halfWidth = Math.ceil(zeroCrossings / (2 * cutoff));
  const kernel = new Float32Array(halfWidth * KERNEL_RESOLUTION + 1);
  for (let i = 0; i < kernel.length; i++) {
    const x = i / KERNEL_RESOLUTION;
    const arg = 2 * cutoff * x;
    const sinc = arg === 0 ? 1 : Math.sin(Math.PI * arg) / (Math.PI * arg);
    const w = x / halfWidth;
    const blackman = 0.42 + 0.5 * Math.cos(Math.PI * w) + 0.08 * Math.cos(2 * Math.PI * w);
    kernel[i] = 2 * cutoff * sinc * blackman;
  }
  const result = { halfWidth, kernel };
  kernelCache.set(key, result);
  return result;
}

/**
 * Reamostragem por sinc janelado (Blackman), que também corta as frequências acima da
 * nova metade da taxa (antialiasing). Guarda o fim de cada bloco para o próximo: o resultado
 * é o mesmo em blocos ou de uma vez. Só entra em uso se o aparelho não aceitar 16 kHz.
 */
export class Resampler {
  private readonly step: number;
  private readonly halfWidth: number;
  private readonly kernel: Float32Array;
  private history: Float32Array;
  /** Posição da próxima amostra de saída, em amostras de `history`. */
  private position: number;

  constructor(
    private readonly fromRate: number,
    private readonly toRate: number,
    zeroCrossings = 16,
  ) {
    this.step = fromRate / toRate;
    ({ halfWidth: this.halfWidth, kernel: this.kernel } = sincKernel(fromRate, toRate, zeroCrossings));
    this.history = new Float32Array(this.halfWidth);
    this.position = this.halfWidth;
  }

  process(input: Float32Array): Float32Array {
    if (this.fromRate === this.toRate) return input;

    const data = new Float32Array(this.history.length + input.length);
    data.set(this.history);
    data.set(input, this.history.length);

    const out = new Float32Array(Math.max(0, Math.ceil((data.length - this.halfWidth - this.position) / this.step)));
    let count = 0;
    while (this.position + this.halfWidth < data.length) {
      const first = Math.ceil(this.position - this.halfWidth);
      const last = Math.floor(this.position + this.halfWidth);
      let sum = 0;
      for (let k = first; k <= last; k++) {
        sum += data[k] * this.kernel[Math.round(Math.abs(this.position - k) * KERNEL_RESOLUTION)];
      }
      out[count++] = sum;
      this.position += this.step;
    }

    const keepFrom = Math.max(0, Math.floor(this.position - this.halfWidth));
    this.history = data.slice(keepFrom);
    this.position -= keepFrom;
    return out.subarray(0, count);
  }
}
