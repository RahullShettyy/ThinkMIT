import assert from 'node:assert';
import rawData from '../data.js';
import { validateContentStructure } from '../src/lib/content-validator.ts';
import { deepFill } from '../src/lib/content.ts';

console.log('--- RUNNING CONTENT EDITOR & VALIDATOR TESTS ---');

const defaultData = ((rawData.default || rawData));

// 1. Structural Validator tests
const validHero = {
  heroHeadline: ['Transform Your Idea.', 'Build Our Future.'],
  subTitle: 'A new sub title',
};
const heroErrors = validateContentStructure(defaultData.site, validHero);
assert.strictEqual(heroErrors.length, 0, 'Valid hero update should have zero errors');

// Structural mismatch: providing a number for site.heroHeadline (which is an array)
const invalidHeroArray = {
  heroHeadline: 12345,
};
const arrayErrors = validateContentStructure(defaultData.site, invalidHeroArray);
assert.ok(arrayErrors.length > 0, 'Invalid array should trigger structural validation error');
assert.ok(arrayErrors[0].message.includes('array'), 'Error message should mention array');

// Structural mismatch: providing a string for an object section
const invalidObject = 'Just a string';
const objErrors = validateContentStructure(defaultData.site, invalidObject);
assert.ok(objErrors.length > 0, 'Replacing object with string should trigger error');

console.log('✓ Content structure validator tests passed');

// 2. Deep Fill and Merge Tests
const originalSite = {
  name: 'THINK MIT',
  tagline: 'Your Idea. Our Campus.',
  heroHeadline: ['Line 1', 'Line 2'],
  details: {
    venue: 'Auditorium',
    date: 'Dec 2026',
  },
};

const overrideSite = {
  tagline: 'Custom Tagline Overridden!',
  details: {
    venue: 'CSE Seminar Hall',
  },
};

const merged = deepFill(originalSite, overrideSite);
assert.strictEqual(merged.name, 'THINK MIT', 'Non-overridden keys must retain default value');
assert.strictEqual(merged.tagline, 'Custom Tagline Overridden!', 'Overridden keys must take custom value');
assert.strictEqual(merged.details.venue, 'CSE Seminar Hall', 'Nested keys must merge');
assert.strictEqual(merged.details.date, 'Dec 2026', 'Non-overridden nested keys must retain default value');

console.log('✓ Deep fill and override merge tests passed');

// 3. New Key Introspection Test
const dataWithDummyKey = {
  ...defaultData.site,
  __dummy_new_feature_key__: 'Auto-discovered text',
};

const keys = Array.from(new Set([...Object.keys(defaultData.site), ...Object.keys(dataWithDummyKey)]));
assert.ok(keys.includes('__dummy_new_feature_key__'), 'New key in data.js is automatically discovered');

console.log('✓ Dynamic key introspection test passed');
console.log('ALL CONTENT EDITOR TESTS PASSED! 🎉');
