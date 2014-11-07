// Based on http://stereopsis.com/radix.html
// Requires typed arrays.
(function(exports) {
  exports.radixsort = radixsort;

  var radixBits,
      maxRadix,
      radixMask,
      histograms;

  function radixsort() {
    function sort(array, aux) {
      var start,
          inner,
          end,
          histogram,
          floating = false;
      if (array instanceof Float32Array) {
        start = startFloat32;
        inner = innerFloat32;
        end = endFloat32;
        histogram = histogramFloat32;
        floating = true;
      } else if (array instanceof Float64Array) {
        start = startFloat64;
        inner = innerFloat64;
        end = endFloat64;
        histogram = histogramFloat64;
        floating = true;
      } else if (array instanceof Uint32Array || array instanceof Uint16Array || array instanceof Uint8Array) {
        start = startInt;
        inner = end = innerUint;
        histogram = histogramUint;
      } else {
        start = startInt;
        inner = innerInt;
        end = endInt;
        histogram = histogramInt;
      }
      var input = floating ? new Int32Array(array.buffer, array.byteOffset, array.byteLength >> 2) : array,
          passCount = Math.ceil(array.BYTES_PER_ELEMENT * 8 / radixBits),
          maxOffset = maxRadix * (passCount - 1),
          msbMask = 1 << ((array.BYTES_PER_ELEMENT * 8 - 1) % radixBits),
          lastMask = (msbMask << 1) - 1,
          tmp;

      aux = aux
          ? floating ? new Int32Array(aux.buffer, aux.byteOffset, aux.byteLength >> 2) : aux
          : new input.constructor(input.length);

      for (var i = 0, n = maxRadix * passCount; i < n; i++) histograms[i] = 0;
      histogram(input, maxOffset, lastMask);
      for (var j = 0; j <= maxOffset; j += maxRadix) {
        for (var id = j, sum = 0; id < j + maxRadix; id++) {
          var tsum = histograms[id] + sum;
          histograms[id] = sum - 1;
          sum = tsum;
        }
      }

      var pass = 0;
      passCount--;
      if (passCount) {
        start(input, aux);
        tmp = aux;
        aux = input;
        input = tmp;
        while (++pass < passCount) {
          inner(input, aux, pass);
          tmp = aux;
          aux = input;
          input = tmp;
        }
      }
      end(input, aux, pass, msbMask);
      return new array.constructor(aux.buffer, aux.byteOffset, array.length);
    }

    sort.radix = function(_) {
      if (!arguments.length) return radixBits;
      maxRadix = 1 << (radixBits = +_);
      radixMask = maxRadix - 1;
      histograms = radixsort._histograms = new Int32Array(maxRadix * Math.ceil(64 / radixBits));
      return sort;
    };

    return sort.radix(11);
  }

  function startInt(input, aux) {
    for (var i = 0, n = input.length; i < n; i++) {
      var d = input[i];
      aux[++histograms[d & radixMask]] = d;
    }
  }

  function innerInt(input, aux, pass) {
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits; i < n; i++) {
      var d = input[i];
      aux[++histograms[offset + (d >>> s & radixMask)]] = d;
    }
  }

  function endInt(input, aux, pass, msbMask) {
    var lastMask = (msbMask << 1) - 1;
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits; i < n; i++) {
      var d = input[i];
      aux[++histograms[offset + (d >>> s & lastMask ^ msbMask)]] = d;
    }
  }

  function innerUint(input, aux, pass) {
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits; i < n; i++) {
      var d = input[i],
          x = d >>> s & radixMask;
      aux[++histograms[offset + x]] = d;
    }
  }

  function startFloat32(input, aux) {
    for (var i = 0, n = input.length; i < n; i++) {
      var d = input[i];
      // Fast check for most-significant bit: signed-shift of a negative value results in 0xffffffff.
      d ^= d >> 31 | 0x80000000;
      aux[++histograms[d & radixMask]] = d;
    }
  }

  function innerFloat32(input, aux, pass) {
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits; i < n; i++) {
      var d = input[i];
      aux[++histograms[offset + (d >>> s & radixMask)]] = d;
    }
  }

  function endFloat32(input, aux, pass, msbMask) {
    var lastMask = (msbMask << 1) - 1;
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits; i < n; i++) {
      var d = input[i],
          x = d >>> s & lastMask;
      aux[++histograms[offset + x]] = d ^ (~d >> 31 | 0x80000000);
    }
  }

  function startFloat64(input, aux) {
    for (var i = 0, n = input.length; i < n; i++) {
      var e = input[i],
          d = input[++i],
          x = d >> 31;
      d ^= x | 0x80000000;
      e ^= x;
      x = ++histograms[e & radixMask] << 1;
      aux[x++] = e;
      aux[x] = d;
    }
  }

  function innerFloat64(input, aux, pass) {
    var s = pass * radixBits, me = radixMask, md = 0, t = 32 - s,
        mt = s < 32 && s > 32 - radixBits
        ? (me = -1 >>> s & radixMask,
          md = 0,
          -1 << t & radixMask)
        : s >= 32
        ? (s -= 32,
          t += 32,
          me = 0,
          md = radixMask,
          0)
        : 0;
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits; i < n; i++) {
      var e = input[i],
          d = input[++i],
          x = ++histograms[offset + (e >>> s & me | d >>> s & md | d << t & mt)] << 1;
      aux[x++] = e;
      aux[x] = d;
    }
  }

  function endFloat64(input, aux, pass, msbMask) {
    var lastMask = (msbMask << 1) - 1;
    for (var i = 0, n = input.length, offset = pass * maxRadix, s = pass * radixBits - 32; i < n; i++) {
      var e = input[i],
          d = input[++i],
          x = d >>> s & lastMask,
          y = ~d >> 31;
      x = ++histograms[offset + x] << 1;
      aux[x++] = e ^ y;
      aux[x] = d ^ (y | 0x80000000);
    }
  }

  function histogramInt(input, maxOffset, lastMask) {
    var msbMask = (lastMask + 1) >>> 1;
    for (var i = 0, n = input.length; i < n; i++) {
      var d = input[i];
      for (var j = 0, k = 0; j < maxOffset; j += maxRadix, k += radixBits) {
        histograms[j + (d >>> k & radixMask)]++;
      }
      histograms[j + (d >>> k & lastMask ^ msbMask)]++;
    }
  }

  function histogramUint(input, maxOffset) {
    for (var i = 0, n = input.length; i < n; i++) {
      var d = input[i];
      for (var j = 0, k = 0; j <= maxOffset; j += maxRadix, k += radixBits) {
        histograms[j + (d >>> k & radixMask)]++;
      }
    }
  }

  function histogramFloat32(input, maxOffset, lastMask) {
    for (var i = 0, n = input.length; i < n; i++) {
      var d = input[i];
      d ^= d >> 31 | 0x80000000;
      for (var j = 0, k = 0; j < maxOffset; j += maxRadix, k += radixBits) {
        histograms[j + (d >>> k & radixMask)]++;
      }
      histograms[j + (d >>> k & lastMask)]++;
    }
  }

  function histogramFloat64(input, maxOffset, lastMask) {
    for (var i = 0, n = input.length; i < n; i++) {
      var e = input[i],
          d = input[++i],
          x = d >> 31;
      d ^= x | 0x80000000;
      e ^= x;
      for (var j = 0, k = 0; k <= 32 - radixBits; j += maxRadix, k += radixBits) {
        histograms[j + (e >>> k & radixMask)]++;
      }
      histograms[j + ((d << (32 - k) | e >>> k) & radixMask)]++;
      for (k += radixBits - 32, j += maxRadix; j < maxOffset; j += maxRadix, k += radixBits) {
        histograms[j + (d >>> k & radixMask)]++;
      }
      histograms[j + (d >>> k & lastMask)]++;
    }
  }
})(this);
