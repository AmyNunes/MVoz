import { resolveColorScheme, themes } from '../theme';
import { palette, typography, type ColorScheme, type ColorTokens } from '../tokens';

/** Contraste WCAG entre duas cores #RRGGBB (1 a 21). */
function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('resolveColorScheme', () => {
  it('segue o sistema quando a preferência é "system"', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
  });

  it('usa o claro quando o sistema não informa o tema', () => {
    expect(resolveColorScheme('system', 'unspecified')).toBe('light');
    expect(resolveColorScheme('system', null)).toBe('light');
  });

  it('respeita a preferência fixa, ignorando o sistema', () => {
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
    expect(resolveColorScheme('light', 'dark')).toBe('light');
  });
});

describe('tokens', () => {
  it('claro e escuro têm as mesmas cores, todas em #RRGGBB', () => {
    expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
    for (const colors of Object.values(palette)) {
      for (const value of Object.values(colors)) {
        expect(value).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it('nenhum texto é menor que 13', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(13);
    }
  });

  it('cada tema aponta para a sua paleta', () => {
    expect(themes.light.colors).toBe(palette.light);
    expect(themes.dark.colors).toBe(palette.dark);
  });
});

describe('contraste AA (mínimo 4,5) dos pares usados na interface', () => {
  const pairs: [keyof ColorTokens, keyof ColorTokens][] = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['text', 'surfaceAlt'],
    ['textMuted', 'bg'],
    ['textMuted', 'surface'],
    ['textMuted', 'surfaceAlt'],
    ['primary', 'bg'],
    ['primary', 'surface'],
    ['onPrimary', 'primary'],
  ];
  const schemes: ColorScheme[] = ['light', 'dark'];

  for (const scheme of schemes) {
    for (const [fg, bg] of pairs) {
      it(`${scheme}: ${fg} sobre ${bg}`, () => {
        const colors = palette[scheme];
        expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('contraste de gráficos e ícones (mínimo 3)', () => {
  const graphics: (keyof ColorTokens)[] = ['target', 'success', 'warning', 'danger'];
  const backgrounds: (keyof ColorTokens)[] = ['bg', 'surface'];
  const schemes: ColorScheme[] = ['light', 'dark'];

  for (const scheme of schemes) {
    for (const fg of graphics) {
      for (const bg of backgrounds) {
        it(`${scheme}: ${fg} sobre ${bg}`, () => {
          const colors = palette[scheme];
          expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
        });
      }
    }
  }
});
