"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { IntlProvider } from "@/lib/intl-provider"
import { ThemeStyleProvider } from "@/contexts/theme-style-context"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeStyleProvider>
          <IntlProvider>
            {children}
          </IntlProvider>
        </ThemeStyleProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  )
}

