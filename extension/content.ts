import { Readability } from "@mozilla/readability";

const state = globalThis as typeof globalThis & {
  __tabBrainCaptureInstalled?: boolean;
};
if (!state.__tabBrainCaptureInstalled) {
  state.__tabBrainCaptureInstalled = true;
  chrome.runtime.onMessage.addListener((request, sender, reply) => {
    if (
      request?.type !== "TAB_BRAIN_EXTRACT" ||
      sender.id !== chrome.runtime.id
    )
      return;
    try {
      if (!/^https?:$/.test(location.protocol))
        throw new Error("This browser page cannot be captured.");
      const clone = document.cloneNode(true) as Document;
      clone
        .querySelectorAll(
          'script,style,noscript,nav,header,footer,form,input,textarea,select,button,[contenteditable],aside,[aria-hidden="true"],svg,canvas,iframe',
        )
        .forEach((node) => node.remove());
      const article = new Readability(clone, { charThreshold: 40 }).parse();
      const text = (article?.textContent || clone.body?.textContent || "")
        .replace(/\u0000/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 36_000);
      if (text.length < 40)
        throw new Error("This page has too little readable text.");
      reply({
        ok: true,
        title: article?.title || document.title || location.hostname,
        text,
        url: location.href,
      });
    } catch (error) {
      reply({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "The readable text could not be extracted.",
      });
    }
  });
}
