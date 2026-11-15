import { z } from 'zod';

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Recursively validates that target conforms to the type structure of defaultVal.
 * Rejects type mismatches that would cause runtime crashes in React render tree.
 */
export function validateContentStructure(
  defaultVal: unknown,
  targetVal: unknown,
  path = ''
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (targetVal === undefined || targetVal === null) {
    if (defaultVal !== null && defaultVal !== undefined) {
      // If default was not null/undefined, target cannot be null unless explicitly allowable
      // Allow null for fields like logoUrl, opensOn, deadline
      if (!path.endsWith('Url') && !path.endsWith('On') && !path.endsWith('deadline') && !path.endsWith('poster')) {
        errors.push({
          path: path || 'root',
          message: `Value cannot be null or undefined. Expected ${typeof defaultVal}.`,
        });
      }
    }
    return errors;
  }

  // Check Arrays
  if (Array.isArray(defaultVal)) {
    if (!Array.isArray(targetVal)) {
      errors.push({
        path: path || 'root',
        message: `Expected an array, received ${typeof targetVal}.`,
      });
      return errors;
    }

    // If default array has an element template, check each item in target
    if (defaultVal.length > 0) {
      const template = defaultVal[0];
      targetVal.forEach((item, idx) => {
        const itemPath = path ? `${path}[${idx}]` : `[${idx}]`;
        const itemErrors = validateContentStructure(template, item, itemPath);
        errors.push(...itemErrors);
      });
    }

    return errors;
  }

  // Check Objects (plain dictionaries)
  if (defaultVal !== null && typeof defaultVal === 'object') {
    if (typeof targetVal !== 'object' || Array.isArray(targetVal) || targetVal === null) {
      errors.push({
        path: path || 'root',
        message: `Expected an object, received ${Array.isArray(targetVal) ? 'array' : typeof targetVal}.`,
      });
      return errors;
    }

    const defObj = defaultVal as Record<string, unknown>;
    const tarObj = targetVal as Record<string, unknown>;

    for (const key of Object.keys(defObj)) {
      const keyPath = path ? `${path}.${key}` : key;
      if (key in tarObj) {
        const fieldErrors = validateContentStructure(defObj[key], tarObj[key], keyPath);
        errors.push(...fieldErrors);
      }
    }

    return errors;
  }

  // Check Primitives
  const defType = typeof defaultVal;
  const tarType = typeof targetVal;

  if (defType === 'number') {
    if (tarType !== 'number' && isNaN(Number(targetVal))) {
      errors.push({
        path: path || 'root',
        message: `Expected number, received ${tarType}.`,
      });
    }
  } else if (defType === 'boolean') {
    if (tarType !== 'boolean') {
      errors.push({
        path: path || 'root',
        message: `Expected boolean, received ${tarType}.`,
      });
    }
  } else if (defType === 'string') {
    if (tarType !== 'string' && tarType !== 'number') {
      errors.push({
        path: path || 'root',
        message: `Expected string, received ${tarType}.`,
      });
    }
  }

  return errors;
}

export const contentSaveSchema = z.object({
  section: z.string().min(1, 'Section name is required'),
  value: z.unknown(),
});
