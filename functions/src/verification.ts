import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export function verifiedOwner(request: Pick<CallableRequest, "auth">): {
  uid: string;
  email: string;
} {
  if (!request.auth)
    throw new HttpsError(
      "unauthenticated",
      "Sign in before setting up email briefs.",
    );
  const email = request.auth.token.email;
  if (
    request.auth.token.email_verified !== true ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    /[\r\n]/.test(email)
  )
    throw new HttpsError(
      "permission-denied",
      "Email briefs need a verified email address. Sign in with Google to continue.",
    );
  return { uid: request.auth.uid, email };
}
