/**
 * Automatically parse message content
 *
 * @private
 * @param {Buffer|string} message - the received message
 * @return an object containing the input message with parsed content
 */
export function parseContent(message: Buffer | string): Record<string, unknown> | string {
  let parsedMessage: Record<string, unknown> | string = message as unknown as Record<string, unknown>;
  if (Buffer.isBuffer(parsedMessage)) {
    parsedMessage = parsedMessage.toString('utf-8');
  }
  let res: Record<string, unknown> | string = parsedMessage;
  try {
    res = JSON.parse(parsedMessage as string) as Record<string, unknown>;
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.error(ex);
  }
  return res;
}

/**
 * Encapsulates contens for publishing messages.
 * If the content is a valid JSON the function stringifies the content
 *
 * @private
 * @param {Object} content - content to publish, could be a string or a JSON object
 * @return the content encapsulated in the proper way
 */
export function encapsulateContent(content: Record<string, unknown>): string {
  let encapsulatedContent: string;
  try {
    encapsulatedContent = JSON.stringify(content);
  } catch (ex) {
    encapsulatedContent = content.toString();
  }
  return encapsulatedContent;
}

/**
 * Check if a value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Deep strict equality check for plain objects
 * Replacement for util.isDeepStrictEqual
 */
export function isDeepStrictEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepStrictEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }
  return true;
}

/**
 * Join URL segments with proper slash handling
 * Replacement for url-join
 */
export function urlJoin(...parts: string[]): string {
  return parts
    .map((part, i) => {
      if (i === 0) return part.replace(/\/+$/, '');
      return part.replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .filter(Boolean)
    .join('/');
}

/**
 * Recursively convert snake_case keys to camelCase
 * Replacement for humps.camelizeKeys
 */
export function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce(
      (acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        acc[camelKey] = camelizeKeys((obj as Record<string, unknown>)[key]);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }
  return obj;
}

export default { parseContent, encapsulateContent, isNullOrUndefined, isDeepStrictEqual, urlJoin, camelizeKeys };
