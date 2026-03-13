'use strict';

class BitField {
  
  constructor(bits = 0n) {
    this.bitfield = this.constructor.resolve(bits);
  }

  has(...bits) {
    const resolved = bits.reduce((acc, bit) => acc | this.constructor.resolve(bit), 0n);
    return (this.bitfield & resolved) === resolved;
  }

  add(...bits) {
    let total = 0n;
    for (const bit of bits) {
      total |= this.constructor.resolve(bit);
    }
    this.bitfield |= total;
    return this;
  }

  remove(...bits) {
    let total = 0n;
    for (const bit of bits) {
      total |= this.constructor.resolve(bit);
    }
    this.bitfield &= ~total;
    return this;
  }

  toggle(...bits) {
    for (const bit of bits) {
      const resolved = this.constructor.resolve(bit);
      if (this.has(resolved)) {
        this.remove(resolved);
      } else {
        this.add(resolved);
      }
    }
    return this;
  }

  toArray() {
    const FLAGS = this.constructor.FLAGS;
    return Object.keys(FLAGS).filter((flag) => this.has(FLAGS[flag]));
  }

  serialize() {
    const serialized = {};
    const FLAGS = this.constructor.FLAGS;
    for (const [flag, bit] of Object.entries(FLAGS)) {
      serialized[flag] = this.has(bit);
    }
    return serialized;
  }

  toJSON() {
    return this.bitfield.toString();
  }

  valueOf() {
    return this.bitfield;
  }

  static resolve(bit) {
    if (typeof bit === 'bigint') return bit;
    if (typeof bit === 'number') return BigInt(bit);
    if (typeof bit === 'string') {
      if (this.FLAGS && this.FLAGS[bit] !== undefined) return this.FLAGS[bit];
      return BigInt(bit);
    }
    if (bit instanceof BitField) return bit.bitfield;
    if (Array.isArray(bit)) {
      return bit.reduce((acc, val) => acc | this.resolve(val), 0n);
    }
    throw new TypeError(`Invalid BitField value: ${bit}`);
  }

  static get ALL() {
    if (!this.FLAGS) return 0n;
    return Object.values(this.FLAGS).reduce((acc, val) => acc | val, 0n);
  }

  static FLAGS = {};
}

module.exports = BitField;
