/**
 * Utilities for filtering and processing data arrays
 */

/**
 * Filters out items from an array where a specific field is null, undefined, or empty string
 * @param data - Array of objects to filter
 * @param field - The field name to check for valid values
 * @returns Filtered array with only items that have valid values for the specified field
 *
 * @example
 * const events = [{id: 1, xthreat: 0.5}, {id: 2, xthreat: null}, {id: 3, xthreat: 0.3}];
 * const validEvents = filterByField(events, 'xthreat');
 * // Returns: [{id: 1, xthreat: 0.5}, {id: 3, xthreat: 0.3}]
 */
export function filterByField<T>(data: T[], field: keyof T): T[] {
  return data.filter(item => {
    const value = item[field];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Filters out items where multiple fields are invalid
 * @param data - Array of objects to filter
 * @param fields - Array of field names to check
 * @returns Filtered array where ALL specified fields have valid values
 */
export function filterByFields<T>(data: T[], fields: (keyof T)[]): T[] {
  return data.filter(item => {
    return fields.every(field => {
      const value = item[field];
      return value !== null && value !== undefined && value !== '';
    });
  });
}

/**
 * Filters out items where a numeric field is null, undefined, empty, or NaN
 * @param data - Array of objects to filter
 * @param field - The numeric field name to check
 * @returns Filtered array with only items that have valid numeric values
 */
export function filterByNumericField<T>(data: T[], field: keyof T): T[] {
  return data.filter(item => {
    const value = item[field];
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'number' && isNaN(value)) return false;
    return true;
  });
}
