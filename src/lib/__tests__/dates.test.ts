import {
  daysBetweenKeys,
  formatShortDate,
  startOfStudyDay,
  startOfWeek,
  studyDayKey,
} from '../dates';
import { formatUsd, parseDecimal } from '../format';

describe('dia de estudo (vira às 04:00)', () => {
  it('03:59 ainda conta como o dia anterior', () => {
    expect(studyDayKey(new Date(2026, 9, 20, 3, 59))).toBe('2026-10-19');
  });

  it('04:00 já é o dia novo', () => {
    expect(studyDayKey(new Date(2026, 9, 20, 4, 0))).toBe('2026-10-20');
  });

  it('respeita outra hora de virada', () => {
    expect(studyDayKey(new Date(2026, 9, 20, 5, 0), 6)).toBe('2026-10-19');
  });

  it('o início do dia de estudo é às 04:00', () => {
    const start = startOfStudyDay(new Date(2026, 9, 20, 1, 0));
    expect(start).toEqual(new Date(2026, 9, 19, 4, 0));
  });
});

describe('formatação de datas', () => {
  it('"seg, 19 out"', () => {
    expect(formatShortDate(new Date(2026, 9, 19))).toBe('seg, 19 out');
  });

  it('semana começa na segunda', () => {
    expect(startOfWeek(new Date(2026, 9, 25))).toEqual(new Date(2026, 9, 19));
  });

  it('diferença em dias entre chaves', () => {
    expect(daysBetweenKeys('2026-10-19', '2026-10-22')).toBe(3);
  });
});

describe('números', () => {
  it('aceita vírgula ou ponto', () => {
    expect(parseDecimal('0,15')).toBe(0.15);
    expect(parseDecimal('0.15')).toBe(0.15);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNaN();
  });

  it('mostra US$ com vírgula', () => {
    expect(formatUsd(1.5)).toBe('US$ 1,50');
    expect(formatUsd(0.0021)).toBe('US$ 0,0021');
  });
});
