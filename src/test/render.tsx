import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import messages from "../../messages/fr.json";

export * from "@testing-library/react";

export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="fr" messages={messages}>
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  });
}
