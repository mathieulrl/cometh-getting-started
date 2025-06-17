"use client";

import {
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
    type webAuthnOptions as WebAuthnOptions,
} from "@cometh/connect-sdk-4337";
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";


export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

    function displayError(message: string) {
        setConnectionError(message);
    }

    async function connect() {
        if (!apiKey) throw new Error("API key not found");
        if (!bundlerUrl) throw new Error("Bundler Url not found");

        console.log("Connecting to smart account...");

        setIsConnecting(true);
        try {


//                         const sdk = new CoinbaseWalletSDK({
//      appName: 'SDK Playground',
//    });

//    const provider = sdk.makeWeb3Provider();
//    const addresses = await provider.request({
//   method: 'eth_requestAccounts',
// }) as string[];

// await provider.request({
//   method: 'personal_sign',
//   params: [
//     `0x${Buffer.from('test message', 'utf8').toString('hex')}`,
//     addresses[0],
//   ],
// });


            const localStorageAddress = window.localStorage.getItem(
                "walletAddress"
            ) as Hex;

            const publicClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: http(),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            }) as PublicClient;

            let smartAccount;

            const comethSignerConfig = {
            // These are the default values we use
                webAuthnOptions: {
                authenticatorSelection: {
                authenticatorAttachment: "cross-platform", //coinbase
                residentKey: "preferred", //required
                userVerification: "preferred", //coinbase
                },
                } as WebAuthnOptions,
                //passKeyName: "Cometh Connect",
                disableEoaFallback: false
            }


            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: arbitrumSepolia,
                    publicClient,
                    smartAccountAddress: localStorageAddress,
                    comethSignerConfig,
                });
            } else {
                console.log("&&&&&1")
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: arbitrumSepolia,
                    publicClient,
                    comethSignerConfig,
                });

                console.log("&&&&&2", smartAccount.address);
                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: arbitrumSepolia,
                publicClient,
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                chain: arbitrumSepolia,
                bundlerTransport: http(bundlerUrl, {
                    retryCount: 5,
                    retryDelay: 1000,
                    timeout: 20_000,
                }),
                paymaster: paymasterClient,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        return await paymasterClient.getUserOperationGasPrice();
                    },
                },
            });





            setSmartAccount(smartAccountClient);
            setIsConnected(true);
        } catch (e) {
            displayError((e as Error).message);
        } finally {
            setIsConnecting(false);
        }
    }

    return {
        smartAccount,
        connect,
        isConnected,
        isConnecting,
        connectionError,
        newSigner,
        setNewSigner,
        setConnectionError,
    };
}
