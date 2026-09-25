const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('esbuild');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'phaseAccess.ts'), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'cjs' }).code;
const moduleUnderTest = { exports: {} };
new Function('module', 'exports', compiled)(moduleUnderTest, moduleUnderTest.exports);
const { getPhaseTwoStart } = moduleUnderTest.exports;

test('format waktu lokal lama dan ISO Firebase sama-sama menunggu tujuh hari', () => {
  const expected = Date.parse('2026-10-02T10:30:00Z');
  assert.equal(getPhaseTwoStart('2026-09-25 10:30'), expected);
  assert.equal(getPhaseTwoStart('2026-09-25T10:30:00.000Z'), expected);
});

test('tanggal Pos 4 yang hilang atau rusak tidak membuka Pos 5', () => {
  assert.equal(getPhaseTwoStart(undefined), null);
  assert.equal(getPhaseTwoStart('tanggal rusak'), null);
});
