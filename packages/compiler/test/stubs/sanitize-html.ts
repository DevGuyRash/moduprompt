const SCRIPT_TAG_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;

const sanitizeHtml = (input: string): string => input.replace(SCRIPT_TAG_REGEX, '');

export default sanitizeHtml;
