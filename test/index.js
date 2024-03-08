const assert = require('node:assert');
const {describe, it} = require('node:test');
require('../public/js/main.js');

describe('addSingleQuoteToCsvIfNeeded', function() {
  it('should add a single quote in front of a formula', function() {
    assert.strictEqual(
      globalThis.addSingleQuoteToCsvIfNeeded('=SUM(A1:A2)'),
      `'=SUM(A1:A2)`
    )
  });

  it('should not add a quote in front of a string', function() {
    assert.strictEqual(
      globalThis.addSingleQuoteToCsvIfNeeded('abc'),
      `abc`
    )
  });

  it('should not add a quote in front of a positive number', function() {
    assert.strictEqual(
      globalThis.addSingleQuoteToCsvIfNeeded('12.5'),
      `12.5`
    )
  });

  it('should add a quote in front of a negative number', function() {
    assert.strictEqual(
      globalThis.addSingleQuoteToCsvIfNeeded('-12'),
      `'-12`
    )
  });
});
