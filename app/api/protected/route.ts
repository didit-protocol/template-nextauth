import { auth } from "auth"

export const GET = auth((req) => {
  if (req.auth) {
    return Response.json({ data: "Protected data" })
  }

  return Response.json({ message: "Not authenticated" }, { status: 401 })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any // TODO: Fix `auth()` return type
