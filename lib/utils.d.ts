/**
 * Automatically parse message content
 *
 * @private
 * @param {Object/String} message - the received message
 * @return an object containing the input message with parsed content
 */
export declare function parseContent(message: any): object;
/**
 * Encapsulates contens for publishing messages.
 * If the content is a valid JSON the function stringifies the content
 *
 * @private
 * @param {Object} content - content to publish, could be a string or a JSON object
 * @return the content encapsulated in the proper way
 */
export declare function encapsulateContent(content: object): string;
declare const _default: {
    parseContent: typeof parseContent;
    encapsulateContent: typeof encapsulateContent;
};
export default _default;
