export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function errorResponse(error: unknown): Response {
  const known = error instanceof HttpError;
  return Response.json(
    { success: false, error: known ? error.code : "internal_error" },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
