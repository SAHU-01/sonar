/**
 * Client-side providers for Sui wallet connection and React Query.
 * Wraps the app with SuiClientProvider, WalletProvider, and QueryClientProvider.
 * Must be a client component — wallets require browser APIs.
 */
'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';

const networks = {
  devnet: { url: getJsonRpcFullnodeUrl('devnet'), network: 'devnet' as const },
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' as const },
};

const defaultNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet') as keyof typeof networks;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={defaultNetwork}>
        <WalletProvider autoConnect>
          {children}
          <Toaster richColors position="bottom-right" />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
