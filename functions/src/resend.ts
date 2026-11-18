import { DeliveryError, type EmailTransport } from "./delivery.js";

export function resendTransport(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): EmailTransport {
  return async (request) => {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": request.idempotencyKey,
      },
      body: JSON.stringify({
        from: request.from,
        to: [request.to],
        subject: request.message.subject,
        html: request.message.html,
        text: request.message.text,
        headers: {
          "List-Unsubscribe": "<" + request.unsubscribeUrl + ">",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!response.ok)
      throw new DeliveryError(
        "The email provider rejected the request.",
        response.status === 429 || response.status >= 500,
      );
    const receipt = (await response.json()) as { id?: unknown };
    if (
      typeof receipt.id !== "string" ||
      !receipt.id ||
      receipt.id.length > 200
    )
      throw new DeliveryError(
        "The email service returned no delivery receipt.",
        true,
      );
    return { id: receipt.id };
  };
}
