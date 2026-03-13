'use strict';

class Collection extends Map {
  
  first(amount) {
    if (amount === undefined) return this.values().next().value;
    if (amount < 0) return this.last(amount * -1);
    amount = Math.min(this.size, amount);
    const iter = this.values();
    return Array.from({ length: amount }, () => iter.next().value);
  }

  last(amount) {
    const arr = [...this.values()];
    if (amount === undefined) return arr[arr.length - 1];
    if (amount < 0) return this.first(amount * -1);
    if (!amount) return [];
    return arr.slice(-amount);
  }

  random(amount) {
    const arr = [...this.values()];
    if (amount === undefined) return arr[Math.floor(Math.random() * arr.length)];
    if (!arr.length || !amount) return [];
    return Array.from(
      { length: Math.min(amount, arr.length) },
      () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]
    );
  }

  filter(fn) {
    const results = new this.constructor[Symbol.species]();
    for (const [key, val] of this) {
      if (fn(val, key, this)) results.set(key, val);
    }
    return results;
  }

  find(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return val;
    }
    return undefined;
  }

  findKey(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return key;
    }
    return undefined;
  }

  map(fn) {
    const iter = this.entries();
    return Array.from({ length: this.size }, () => {
      const [key, value] = iter.next().value;
      return fn(value, key, this);
    });
  }

  some(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return true;
    }
    return false;
  }

  every(fn) {
    for (const [key, val] of this) {
      if (!fn(val, key, this)) return false;
    }
    return true;
  }

  reduce(fn, initialValue) {
    let accumulator;
    const iterator = this.entries();

    if (initialValue !== undefined) {
      accumulator = initialValue;
    } else {
      const first = iterator.next();
      if (first.done) throw new TypeError('Reduce of empty collection with no initial value');
      accumulator = first.value[1];
    }

    for (const [key, val] of iterator) {
      accumulator = fn(accumulator, val, key, this);
    }

    return accumulator;
  }

  sweep(fn) {
    const previousSize = this.size;
    for (const [key, val] of this) {
      if (fn(val, key, this)) this.delete(key);
    }
    return previousSize - this.size;
  }

  clone() {
    return new this.constructor[Symbol.species](this);
  }

  concat(...collections) {
    const newColl = this.clone();
    for (const coll of collections) {
      for (const [key, val] of coll) newColl.set(key, val);
    }
    return newColl;
  }

  partition(fn) {
    const results = [new this.constructor[Symbol.species](), new this.constructor[Symbol.species]()];
    for (const [key, val] of this) {
      if (fn(val, key, this)) {
        results[0].set(key, val);
      } else {
        results[1].set(key, val);
      }
    }
    return results;
  }

  toArray() {
    return [...this.values()];
  }

  keyArray() {
    return [...this.keys()];
  }

  toJSON() {
    return this.toArray();
  }

  sort(compareFn = Collection.defaultSort) {
    const entries = [...this.entries()].sort((a, b) => compareFn(a[1], b[1], a[0], b[0]));
    super.clear();
    for (const [key, val] of entries) {
      super.set(key, val);
    }
    return this;
  }

  tap(fn) {
    fn(this);
    return this;
  }

  ensure(key, value) {
    if (this.has(key)) return this.get(key);
    if (typeof value === 'function') value = value(key, this);
    this.set(key, value);
    return value;
  }

  static defaultSort(firstValue, secondValue) {
    return Number(firstValue > secondValue) || Number(firstValue === secondValue) - 1;
  }

  static get [Symbol.species]() {
    return Collection;
  }
}

module.exports = Collection;
