
/**
 * Automatically parse message content
 *
 * @private
 * @param {Object/String} message - the received message
 * @return an object containing the input message with parsed content
 */
export function parseContent(message) {
  let parsedMessage = message;
  if (Buffer.isBuffer(parsedMessage)) {
    parsedMessage = parsedMessage.toString('utf-8');
  }
  let res;
  try {
    res = JSON.parse(parsedMessage);
  } catch (ex) {
    res = parsedMessage;
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
export function encapsulateContent(content) {
  let encapsulatedContent = content;
  try {
    encapsulatedContent = JSON.stringify(content);
  } catch (ex) {
    encapsulatedContent = content;
  }
  return encapsulatedContent;
}

const utilsFunctions = { parseContent, encapsulateContent };
export default utilsFunctions;
