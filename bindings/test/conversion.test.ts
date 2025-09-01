
import duckdb from '@rizecom/duckdb-node-bindings';
import { expect, suite, test } from 'vitest';

suite('conversion', () => {
  suite('from_date', () => {
    test('mid-range', () => {
      expect(duckdb.from_date({ days: 19877 })).toStrictEqual({ year: 2024, month: 6, day: 3 });
    });
    test('max', () => {
      expect(duckdb.from_date({ days: 0x7FFFFFFE })).toStrictEqual({ year: 5881580, month: 7, day: 10 });
    });
    test('min', () => {
      expect(duckdb.from_date({ days: -0x7FFFFFFE })).toStrictEqual({ year: -5877641, month: 6, day: 25 });
    });
  });
  suite('to_date', () => {
    test('mid-range', () => {
      expect(duckdb.to_date({ year: 2024, month: 6, day: 3 })).toStrictEqual({ days: 19877 });
    });
    test('max', () => {
      expect(duckdb.to_date({ year: 5881580, month: 7, day: 10 })).toStrictEqual({ days: 0x7FFFFFFE });
    });
    test('min', () => {
      expect(duckdb.to_date({ year: -5877641, month: 6, day: 25 })).toStrictEqual({ days: -0x7FFFFFFE });
    });
  });
  suite('is_finite_date', () => {
    test('finite', () => {
      expect(duckdb.is_finite_date({ days: 19877 })).toBe(true);
    });
    test('infinity', () => {
      expect(duckdb.is_finite_date({ days: 0x7FFFFFFF })).toBe(false);
    });
    test('-infinity', () => {
      expect(duckdb.is_finite_date({ days: -0x7FFFFFFF })).toBe(false);
    });
  });
  suite('from_time', () => {
    test('mid-range', () => {
      // 45296789123 = 1000000 * (60 * (60 * 12 + 34) + 56) + 789123 = 12:34:56.789123
      expect(duckdb.from_time({ micros: 45296789123n })).toStrictEqual({ hour: 12, min: 34, sec: 56, micros: 789123 });
    });
    test('min', () => {
      expect(duckdb.from_time({ micros: 0n })).toStrictEqual({ hour: 0, min: 0, sec: 0, micros: 0 });
    });
    test('max', () => {
      // 86400000000 = 1000000 * (60 * (60 * 24 + 0) + 0) + 0 = 24:00:00.000000
      expect(duckdb.from_time({ micros: 86400000000n })).toStrictEqual({ hour: 24, min: 0, sec: 0, micros: 0 });
    });
  });
  suite('create_time_tz', () => {
    // See datetime.hpp for format of "bits" field. Summary:
    //   40 bits for micros, then 24 bits for encoded offset in seconds.
    //   Max absolute unencoded offset = 15:59:59 = 60 * (60 * 15 + 59) + 59 = 57599.
    //   Encoded offset is unencoded offset inverted then shifted (by +57599) to unsigned.
    //   Max unencoded offset = 57599 -> -57599 -> 0 encoded.
    //   Min unencoded offset = -57599 -> 57599 -> 115198 encoded.
    test('mid-range', () => {
      // 45296789123 = 1000000 * (60 * (60 * 12 + 34) + 56) + 789123 = 12:34:56.789123
      // 759954015223079167n = (45296789123n << 24n) + 57599n
      expect(duckdb.create_time_tz(45296789123, 0)).toStrictEqual({ bits: 759954015223079167n });
    });
    test('min', () => {
      expect(duckdb.create_time_tz(0, 57599)).toStrictEqual({ bits: 0n });
    });
    test('max', () => {
      // 1449551462400115198n = (86400000000n << 24n) + 2n * 57599n
      expect(duckdb.create_time_tz(86400000000, -57599)).toStrictEqual({ bits: 1449551462400115198n });
    });
  });
  suite('from_time_tz', () => {
    test('mid-range', () => {
      expect(duckdb.from_time_tz({ bits: 759954015223079167n })).toStrictEqual({ time: { hour: 12, min: 34, sec: 56, micros: 789123 }, offset: 0 });
    });
    test('min', () => {
      expect(duckdb.from_time_tz({ bits: 0n })).toStrictEqual({ time: { hour: 0, min: 0, sec: 0, micros: 0 }, offset: 57599 });
    });
    test('max', () => {
      expect(duckdb.from_time_tz({ bits: 1449551462400115198n })).toStrictEqual({ time: { hour: 24, min: 0, sec: 0, micros: 0 }, offset: -57599 });
    });
    test('out of uint64 range', () => {
      expect(() => duckdb.from_time_tz({ bits: 2n ** 64n })).toThrowError('bits out of uint64 range');
    });
  });
  suite('to_time', () => {
    test('mid-range', () => {
      expect(duckdb.to_time({ hour: 12, min: 34, sec: 56, micros: 789123 })).toStrictEqual({ micros: 45296789123n });
    });
    test('min', () => {
      expect(duckdb.to_time({ hour: 0, min: 0, sec: 0, micros: 0 })).toStrictEqual({ micros: 0n });
    });
    test('max', () => {
      expect(duckdb.to_time({ hour: 24, min: 0, sec: 0, micros: 0 })).toStrictEqual({ micros: 86400000000n });
    });
  });
  suite('from_timestamp', () => {
    test('mid-range', () => {
      // 1717418096789123n = 19877n * 86400000000n + 45296789123n
      expect(duckdb.from_timestamp({ micros: 1717418096789123n })).toStrictEqual({
        date: { year: 2024, month: 6, day: 3 },
        time: { hour: 12, min: 34, sec: 56, micros: 789123 },
      });
    });
    test('epoch', () => {
      expect(duckdb.from_timestamp({ micros: 0n })).toStrictEqual({
        date: { year: 1970, month: 1, day: 1 },
        time: { hour: 0, min: 0, sec: 0, micros: 0 },
      });
    });
    test('min', () => {
      // min timestamp = 290309-12-22 (BC) 00:00:00
      expect(duckdb.from_timestamp({ micros: -9223372022400000000n })).toStrictEqual({
        date: { year: -290308, month: 12, day: 22 },
        time: { hour: 0, min: 0, sec: 0, micros: 0 },
      });
    });
    test('max', () => {
      // max timestamp = 294247-01-10 04:00:54.775806
      expect(duckdb.from_timestamp({ micros: 9223372036854775806n })).toStrictEqual({
        date: { year: 294247, month: 1, day: 10 },
        time: { hour: 4, min: 0, sec: 54, micros: 775806 },
      });
    });
    test('out of int64 range (positive)', () => {
      expect(() => duckdb.from_timestamp({ micros: 2n ** 63n })).toThrowError('micros out of int64 range');
    });
    test('out of int64 range (negative)', () => {
      expect(() => duckdb.from_timestamp({ micros: -(2n ** 63n + 1n) })).toThrowError('micros out of int64 range');
    });
  });
  suite('to_timestamp', () => {
    test('mid-range', () => {
      // 1717418096789123n = 19877n * 86400000000n + 45296789123n
      expect(duckdb.to_timestamp({
        date: { year: 2024, month: 6, day: 3 },
        time: { hour: 12, min: 34, sec: 56, micros: 789123 },
      })).toStrictEqual({ micros: 1717418096789123n });
    });
    test('epoch', () => {
      expect(duckdb.to_timestamp({
        date: { year: 1970, month: 1, day: 1 },
        time: { hour: 0, min: 0, sec: 0, micros: 0 },
      })).toStrictEqual({ micros: 0n });
    });
    test('min', () => {
      // min timestamp = 290309-12-22 (BC) 00:00:00
      expect(duckdb.to_timestamp({
        date: { year: -290308, month: 12, day: 22 },
        time: { hour: 0, min: 0, sec: 0, micros: 0 },
      })).toStrictEqual({ micros: -9223372022400000000n });
    });
    test('max', () => {
      // max timestamp = 294247-01-10 04:00:54.775806
      expect(duckdb.to_timestamp({
        date: { year: 294247, month: 1, day: 10 },
        time: { hour: 4, min: 0, sec: 54, micros: 775806 },
      })).toStrictEqual({ micros: 9223372036854775806n });
    });
  });
  suite('is_finite_timestamp', () => {
    test('mid-range', () => {
      expect(duckdb.is_finite_timestamp({ micros: 1717418096789123n })).toBe(true);
    });
    test('epoch', () => {
      expect(duckdb.is_finite_timestamp({ micros: 0n })).toBe(true);
    });
    test('min', () => {
      expect(duckdb.is_finite_timestamp({ micros: -9223372022400000000n })).toBe(true);
    });
    test('max', () => {
      expect(duckdb.is_finite_timestamp({ micros: 9223372036854775806n })).toBe(true);
    });
    test('infinity', () => {
      expect(duckdb.is_finite_timestamp({ micros: 2n ** 63n - 1n })).toBe(false);
    });
    test('-infinity', () => {
      expect(duckdb.is_finite_timestamp({ micros: -(2n ** 63n - 1n) })).toBe(false);
    });
  });
  suite('is_finite_timestamp_s', () => {
    test('mid-range', () => {
      expect(duckdb.is_finite_timestamp_s({ seconds: 1717418096n })).toBe(true);
    });
    test('epoch', () => {
      expect(duckdb.is_finite_timestamp_s({ seconds: 0n })).toBe(true);
    });
    test('min', () => {
      expect(duckdb.is_finite_timestamp_s({ seconds: -9223372022400n })).toBe(true);
    });
    test('max', () => {
      expect(duckdb.is_finite_timestamp_s({ seconds: 9223372036854n })).toBe(true);
    });
    test('infinity', () => {
      expect(duckdb.is_finite_timestamp_s({ seconds: 2n ** 63n - 1n })).toBe(false);
    });
    test('-infinity', () => {
      expect(duckdb.is_finite_timestamp_s({ seconds: -(2n ** 63n - 1n) })).toBe(false);
    });
  });
  suite('is_finite_timestamp_ms', () => {
    test('mid-range', () => {
      expect(duckdb.is_finite_timestamp_ms({ millis: 1717418096789n })).toBe(true);
    });
    test('epoch', () => {
      expect(duckdb.is_finite_timestamp_ms({ millis: 0n })).toBe(true);
    });
    test('min', () => {
      expect(duckdb.is_finite_timestamp_ms({ millis: -9223372022400000n })).toBe(true);
    });
    test('max', () => {
      expect(duckdb.is_finite_timestamp_ms({ millis: 9223372036854775n })).toBe(true);
    });
    test('infinity', () => {
      expect(duckdb.is_finite_timestamp_ms({ millis: 2n ** 63n - 1n })).toBe(false);
    });
    test('-infinity', () => {
      expect(duckdb.is_finite_timestamp_ms({ millis: -(2n ** 63n - 1n) })).toBe(false);
    });
  });
  suite('is_finite_timestamp_ns', () => {
    test('mid-range', () => {
      expect(duckdb.is_finite_timestamp_ns({ nanos: 1717418096789123000n })).toBe(true);
    });
    test('epoch', () => {
      expect(duckdb.is_finite_timestamp_ns({ nanos: 0n })).toBe(true);
    });
    test('min', () => {
      expect(duckdb.is_finite_timestamp_ns({ nanos: -9223286400000000000n })).toBe(true);
    });
    test('max', () => {
      expect(duckdb.is_finite_timestamp_ns({ nanos: 9223372036854775806n })).toBe(true);
    });
    test('infinity', () => {
      expect(duckdb.is_finite_timestamp_ns({ nanos: 2n ** 63n - 1n })).toBe(false);
    });
    test('-infinity', () => {
      expect(duckdb.is_finite_timestamp_ns({ nanos: -(2n ** 63n - 1n) })).toBe(false);
    });
  });
  suite('hugeint_to_double', () => {
    test('zero', () => {
      expect(duckdb.hugeint_to_double(0n)).toBe(0);
    });
    test('one', () => {
      expect(duckdb.hugeint_to_double(1n)).toBe(1);
    });
    test('negative one', () => {
      expect(duckdb.hugeint_to_double(-1n)).toBe(-1);
    });
    test('one word', () => {
      expect(duckdb.hugeint_to_double(2n ** 63n)).toBe(9.223372036854776e+18);
    });
    test('two words', () => {
      expect(duckdb.hugeint_to_double(2n ** 65n)).toBe(3.6893488147419103e+19);
    });
    test('negative one word', () => {
      expect(duckdb.hugeint_to_double(-(2n ** 63n))).toBe(-9.223372036854776e+18);
    });
    test('negative two words', () => {
      expect(duckdb.hugeint_to_double(-(2n ** 65n))).toBe(-3.6893488147419103e+19);
    });
    test('min', () => {
      expect(duckdb.hugeint_to_double(-(2n ** 127n - 1n))).toBe(-1.7014118346046923e+38);
    });
    test('max', () => {
      expect(duckdb.hugeint_to_double(2n ** 127n - 1n)).toBe(1.7014118346046923e+38);
    });
    test('near min', () => {
      expect(duckdb.hugeint_to_double(-(2n ** 127n - 2n ** 74n))).toBe(-1.7014118346046922e+38);
    });
    test('near max', () => {
      expect(duckdb.hugeint_to_double(2n ** 127n - 2n ** 74n)).toBe(1.7014118346046922e+38);
    });
    test('out of range (positive)', () => {
      expect(() => duckdb.hugeint_to_double(2n ** 129n)).toThrowError('bigint out of hugeint range');
    });
    test('out of range (negative)', () => {
      expect(() => duckdb.hugeint_to_double(-(2n ** 129n))).toThrowError('bigint out of hugeint range');
    });
  });
  suite('double_to_hugeint', () => {
    test('zero', () => {
      expect(duckdb.double_to_hugeint(0)).toBe(0n);
    });
    test('one', () => {
      expect(duckdb.double_to_hugeint(1)).toBe(1n);
    });
    test('negative one', () => {
      expect(duckdb.double_to_hugeint(-1)).toBe(-1n);
    });
    test('one word', () => {
      expect(duckdb.double_to_hugeint(9.223372036854776e+18)).toBe(2n ** 63n);
    });
    test('two words', () => {
      expect(duckdb.double_to_hugeint(3.6893488147419103e+19)).toBe(2n ** 65n);
    });
    test('negative one word', () => {
      expect(duckdb.double_to_hugeint(-9.223372036854776e+18)).toBe(-(2n ** 63n));
    });
    test('negative two words', () => {
      expect(duckdb.double_to_hugeint(-3.6893488147419103e+19)).toBe(-(2n ** 65n));
    });
    test('near min', () => {
      expect(duckdb.double_to_hugeint(-1.7014118346046922e+38)).toBe(-(2n ** 127n - 2n ** 74n));
    });
    test('near max', () => {
      expect(duckdb.double_to_hugeint(1.7014118346046922e+38)).toBe(2n ** 127n - 2n ** 74n);
    });
    test('out of range (positive)', () => {
      expect(duckdb.double_to_hugeint(1.8e+38)).toBe(0n);
    });
    test('out of range (negative)', () => {
      expect(duckdb.double_to_hugeint(-1.8e+38)).toBe(0n);
    });
  });
  suite('uhugeint_to_double', () => {
    test('zero', () => {
      expect(duckdb.uhugeint_to_double(0n)).toBe(0);
    });
    test('one', () => {
      expect(duckdb.uhugeint_to_double(1n)).toBe(1);
    });
    test('one word', () => {
      expect(duckdb.uhugeint_to_double(2n ** 63n)).toBe(9.223372036854776e+18);
    });
    test('two words', () => {
      expect(duckdb.uhugeint_to_double(2n ** 65n)).toBe(3.6893488147419103e+19);
    });
    test('max', () => {
      expect(duckdb.uhugeint_to_double(2n ** 127n - 1n)).toBe(1.7014118346046923e+38);
    });
    test('near max', () => {
      expect(duckdb.uhugeint_to_double(2n ** 127n - 2n ** 74n)).toBe(1.7014118346046922e+38);
    });
    test('out of range (positive)', () => {
      expect(() => duckdb.uhugeint_to_double(2n ** 129n)).toThrowError('bigint out of uhugeint range');
    });
    test('out of range (negative)', () => {
      expect(() => duckdb.uhugeint_to_double(-1n)).toThrowError('bigint out of uhugeint range');
    });
  });
  suite('double_to_uhugeint', () => {
    test('zero', () => {
      expect(duckdb.double_to_uhugeint(0)).toBe(0n);
    });
    test('one', () => {
      expect(duckdb.double_to_uhugeint(1)).toBe(1n);
    });
    test('one word', () => {
      expect(duckdb.double_to_uhugeint(9.223372036854776e+18)).toBe(2n ** 63n);
    });
    test('two words', () => {
      expect(duckdb.double_to_uhugeint(3.6893488147419103e+19)).toBe(2n ** 65n);
    });
    test('near max', () => {
      expect(duckdb.double_to_uhugeint(1.7014118346046922e+38)).toBe(2n ** 127n - 2n ** 74n);
    });
    test('out of range (positive)', () => {
      expect(duckdb.double_to_uhugeint(3.5e+38)).toBe(0n);
    });
    test('out of range (negative)', () => {
      expect(duckdb.double_to_uhugeint(-1)).toBe(0n);
    });
  });
  suite('double_to_decimal', () => {
    test('zero', () => {
      expect(duckdb.double_to_decimal(0, 4, 1)).toStrictEqual({ width: 4, scale: 1, value: 0n });
    });
    test('one', () => {
      expect(duckdb.double_to_decimal(1, 9, 4)).toStrictEqual({ width: 9, scale: 4, value: 10000n });
    });
    test('negative one', () => {
      expect(duckdb.double_to_decimal(-1, 9, 4)).toStrictEqual({ width: 9, scale: 4, value: -10000n });
    });
    test('one word', () => {
      expect(duckdb.double_to_decimal(123456789012.34568, 18, 6)).toStrictEqual(
        { width: 18, scale: 6, value: 123456789012345680n }
      );
    });
    test('two words', () => {
      expect(duckdb.double_to_decimal(1.2345678901234567e+27, 38, 10)).toStrictEqual(
        { width: 38, scale: 10, value: 12345678901234567525491324606797053952n }
      );
    });
    test('negative one word', () => {
      expect(duckdb.double_to_decimal(-123456789012.34568, 18, 6)).toStrictEqual(
        { width: 18, scale: 6, value: -123456789012345680n }
      );
    });
    test('negative two words', () => {
      expect(duckdb.double_to_decimal(-1.2345678901234567e+27, 38, 10)).toStrictEqual(
        { width: 38, scale: 10, value: -12345678901234567525491324606797053952n }
      );
    });
    test('out of range (positive)', () => {
      expect(duckdb.double_to_decimal(1e+38, 38, 0)).toStrictEqual(
        { width: 0, scale: 0, value: 0n }
      );
    });
    test('out of range (negative)', () => {
      expect(duckdb.double_to_decimal(-1e+38, 38, 0)).toStrictEqual(
        { width: 0, scale: 0, value: 0n }
      );
    });
    test('out of range (width)', () => {
      expect(duckdb.double_to_decimal(1, 39, 0)).toStrictEqual(
        { width: 0, scale: 0, value: 0n }
      );
    });
    test('out of range (scale)', () => {
      expect(duckdb.double_to_decimal(1, 4, 4)).toStrictEqual(
        { width: 0, scale: 0, value: 0n }
      );
    });
  });
  suite('decimal_to_double', () => {
    test('zero', () => {
      expect(duckdb.decimal_to_double({ width: 4, scale: 1, value: 0n })).toBe(0);
    });
    test('one', () => {
      expect(duckdb.decimal_to_double({ width: 9, scale: 4, value: 10000n })).toBe(1);
    });
    test('negative one', () => {
      expect(duckdb.decimal_to_double({ width: 9, scale: 4, value: -10000n })).toBe(-1);
    });
    test('one word', () => {
      expect(
        duckdb.decimal_to_double({
          width: 18,
          scale: 6,
          value: 123456789012345680n,
        })
      ).toBe(123456789012.34568);
    });
    test('two words', () => {
      expect(
        duckdb.decimal_to_double({
          width: 38,
          scale: 10,
          value: 12345678901234567525491324606797053952n,
        })
      ).toBe(1.2345678901234567e+27);
    });
    test('negative one word', () => {
      expect(
        duckdb.decimal_to_double({
          width: 18,
          scale: 6,
          value: -123456789012345680n,
        })
      ).toBe(-123456789012.34568);
    });
    test('negative two words', () => {
      expect(
        duckdb.decimal_to_double({
          width: 38,
          scale: 10,
          value: -12345678901234567525491324606797053952n,
        })
      ).toBe(-1.2345678901234567e+27);
    });
  });
});
