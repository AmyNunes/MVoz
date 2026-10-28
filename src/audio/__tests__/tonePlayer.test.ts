import { createTonePlayer, toneKey } from '../tonePlayer';

type Status = { didJustFinish: boolean };

const mockPlayers: { uri: string; play: jest.Mock; remove: jest.Mock; finish: () => void }[] = [];
const mockWrites: string[] = [];
const mockExisting = new Set<string>();

jest.mock('expo-audio', () => ({
  createAudioPlayer: ({ uri }: { uri: string }) => {
    let listener: (s: Status) => void = () => {};
    const player = {
      uri,
      play: jest.fn(),
      remove: jest.fn(),
      addListener: (_: string, l: (s: Status) => void) => {
        listener = l;
        return { remove: jest.fn() };
      },
      finish: () => listener({ didJustFinish: true }),
    };
    mockPlayers.push(player);
    return player;
  },
}));

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create() {}
  }
  class File extends Directory {
    get exists() {
      return mockExisting.has(this.uri);
    }
    async write() {
      mockWrites.push(this.uri);
      mockExisting.add(this.uri);
    }
  }
  return { Directory, File, Paths: { cache: { uri: 'cache:' } } };
});

beforeEach(() => {
  mockPlayers.length = 0;
  mockWrites.length = 0;
  mockExisting.clear();
});

describe('tom de referência no celular', () => {
  it('gera o arquivo uma vez e toca', async () => {
    const onPlaying = jest.fn();
    const player = createTonePlayer(onPlaying);

    await player.play({ kind: 'note', hz: 200, seconds: 2 });
    await player.play({ kind: 'note', hz: 200, seconds: 2 });

    expect(mockWrites).toEqual(['cache:/tones/note-200.0-2.wav']);
    expect(mockPlayers[1].play).toHaveBeenCalled();
    expect(mockPlayers[0].remove).toHaveBeenCalled();
    expect(onPlaying).toHaveBeenLastCalledWith(true);
  });

  it('avisa quando termina e libera o player', async () => {
    const onPlaying = jest.fn();
    await createTonePlayer(onPlaying).play({ kind: 'note', hz: 220, seconds: 2 });

    mockPlayers[0].finish();
    expect(onPlaying).toHaveBeenLastCalledWith(false);
    expect(mockPlayers[0].remove).toHaveBeenCalled();
  });

  it('nomes diferentes para tons diferentes', () => {
    const a = toneKey({ kind: 'contour', points: [{ t: 0, hz: 180 }, { t: 1, hz: 200 }] });
    const b = toneKey({ kind: 'contour', points: [{ t: 0, hz: 180 }, { t: 1, hz: 210 }] });
    expect(a).not.toBe(b);
    expect(toneKey({ kind: 'glide', fromHz: 150, toHz: 300, seconds: 3 })).toBe('glide-150.0-300.0-3');
  });
});
