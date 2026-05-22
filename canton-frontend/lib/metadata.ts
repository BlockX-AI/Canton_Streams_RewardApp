import type { Metadata } from "next";

const BASE_URL = "https://growstreams.xyz";

export const baseMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "GrowStreams — Privacy-Native Payment Streaming for Canton",
    template: "%s | GrowStreams",
  },
  description:
    "Open-source payment streaming primitive for Canton Network. Daml smart contracts, TypeScript SDK, CIP-56 and CIP-103 compliant. 66 tests passing on Canton 3.4.11.",
  keywords: [
    "Canton",
    "payment streaming",
    "Daml",
    "blockchain",
    "CIP-56",
    "USDCx",
    "Canton Coin",
    "GrowStreams",
    "token vesting",
    "LP incentives",
  ],
  authors: [{ name: "BlockX AI Ltd", url: "https://growstreams.xyz" }],
  creator: "BlockX AI Ltd",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "GrowStreams",
    title: "GrowStreams — Privacy-Native Payment Streaming for Canton",
    description:
      "Open-source payment streaming primitive for Canton. On-ledger, private, deterministic.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrowStreams — Privacy-Native Payment Streaming for Canton",
    description:
      "Open-source payment streaming primitive for Canton. On-ledger, private, deterministic.",
    creator: "@GrowwStreams",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function createMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description?: string;
  path?: string;
}): Metadata {
  return {
    ...baseMetadata,
    ...(title && { title }),
    ...(description && { description }),
    ...(path && {
      alternates: { canonical: `${BASE_URL}${path}` },
    }),
  };
}
