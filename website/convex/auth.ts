export function authorize(secret: string) {
  const expected = process.env.CONVEX_INTERNAL_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized");
}
