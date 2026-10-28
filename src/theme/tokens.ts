/**
 * Tokens do design system (seção 4 da spec).
 * Nenhuma tela usa cor, tamanho ou duração "solta": tudo vem daqui.
 */

export type ColorScheme = 'light' | 'dark';

export type ColorTokens = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  /** Bordas da faixa-alvo e curva-alvo (só gráfico, nunca texto). */
  target: string;
  /** Preenchimento da faixa-alvo. */
  targetSoft: string;
  /** "Na faixa", marco cumprido (sempre com ícone). */
  success: string;
  /** Cansaço, "abaixo da faixa" (sempre com ícone). */
  warning: string;
  /** Gravando, "Senti dor", excluir. */
  danger: string;
  /** Fundo escurecido atrás de sobreposições. */
  scrim: string;
};

export const palette: Record<ColorScheme, ColorTokens> = {
  light: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE8',
    border: '#E3E0DA',
    text: '#1C1B19',
    textMuted: '#6B6862',
    primary: '#6E56CF',
    onPrimary: '#FFFFFF',
    target: '#0D8B7D',
    targetSoft: '#D5F2EC',
    success: '#218358',
    warning: '#B45309',
    danger: '#E5484D',
    scrim: '#000000',
  },
  dark: {
    bg: '#111113',
    surface: '#1A1A1D',
    surfaceAlt: '#232326',
    border: '#2E2E33',
    text: '#EDEDEF',
    textMuted: '#A1A1A8',
    primary: '#9E8CFC',
    onPrimary: '#0B0B0C',
    target: '#2EC8B5',
    targetSoft: '#10302B',
    success: '#3DD68C',
    warning: '#F5A524',
    danger: '#F2555A',
    scrim: '#000000',
  },
};

export type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
};

/** Fonte do sistema (Roboto no Android), por isso não há `fontFamily`. */
export const typography = {
  /** Hz grande do medidor. */
  meter: { fontSize: 56, lineHeight: 64, fontWeight: '700' },
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  /** Textos de leitura dos exercícios (ajustável 16–26). */
  reading: { fontSize: 20, lineHeight: 30, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** Margem lateral das telas. */
  screen: 16,
} as const;

export const radii = {
  /** Chips e campos. */
  sm: 8,
  /** Botões e linhas de lista. */
  md: 14,
  /** Cartões grandes e sheets. */
  lg: 24,
  /** Círculos (ex.: botão do medidor). */
  full: 999,
} as const;

/** Sombra só no botão central e no cartão do medidor (Android usa `elevation`). */
export const elevation = {
  card: 3,
  fab: 4,
} as const;

export const durations = {
  micro: 150,
  transition: 220,
  /** Meio ciclo do "pulsar" do Skeleton (não está na spec; valor calmo). */
  pulse: 900,
} as const;

export const opacity = {
  pressed: 0.7,
  disabled: 0.4,
  skeletonDim: 0.5,
} as const;

export const springs = {
  drag: { damping: 18, stiffness: 180 },
} as const;

export const sizes = {
  /** Alvo de toque mínimo (dp). */
  touchTarget: 48,
  buttonHeight: 48,
  buttonHeightMain: 56,
  tabBarHeight: 64,
  fab: 56,
  icon: 24,
  iconSmall: 18,
  iconLarge: 40,
  chipHeight: 36,
  listRowHeight: 56,
  multilineHeight: 112,
  /** Altura do traçado do tom no detalhe da gravação. */
  traceHeight: 200,
  /** Altura mínima do traçado ao vivo no player (nunca some, mesmo com fonte grande). */
  traceMinHeight: 100,
  /** Altura mínima da área de medição do player. */
  measureMinHeight: 160,
  /** Altura máxima do cartão de leitura (o texto rola dentro dele). */
  readingCardMaxHeight: 200,
  /** Círculo colorido atrás de ícones (IconBadge). */
  badge: { sm: 32, md: 40, lg: 56 },
  badgeIcon: { sm: 18, md: 22, lg: 28 },
} as const;

/** Espaçamento entre letras de títulos em maiúsculas. */
export const tracking = {
  caps: 0.6,
} as const;

/** A escala de fonte do sistema é respeitada até 130%. */
export const maxFontScale = 1.3;
