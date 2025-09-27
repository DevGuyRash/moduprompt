export type DocumentListResponse = unknown;
export type DocumentResponse = unknown;
export type SetStatusRequest = unknown;
export type SetTagsRequest = unknown;
export type UpdateDocumentRequest = Record<string, unknown>;

const passThrough = { parse: (value: unknown) => value } as const;

export const documentListResponseSchema = passThrough;
export const documentResponseSchema = passThrough;
export const setStatusRequestSchema = passThrough;
export const setTagsRequestSchema = passThrough;
export const updateDocumentRequestSchema = passThrough;
