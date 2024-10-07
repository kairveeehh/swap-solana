'use client';

import styles from './swap.module.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, Connection } from '@solana/web3.js';
import React, { useState, useEffect, useCallback } from 'react';

const assets = [
  { name: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9},
  { name: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6},
  { name: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
  { name: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6},
];

const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
) => {
  let timeout: NodeJS.Timeout | undefined;

  return (...args: T) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function Swap() {
  const [fromAsset, setFromAsset] = useState(assets[0]);
  const [toAsset, setToAsset] = useState(assets[1]);
  const [fromAmount, setFromAmount] = useState(0);
  const [toAmount, setToAmount] = useState(0);
  const [quoteResponse, setQuoteResponse] = useState(null);

  const wallet = useWallet();

  // Need a custom RPC so you don't get rate-limited, don't rely on users' wallets
  const connection = new Connection(
    'https://api.devnet.solana.com'
  );

  const handleFromAssetChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setFromAsset(
      assets.find((asset) => asset.name === event.target.value) || assets[0]
    );
  };

  const handleToAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setToAsset(
      assets.find((asset) => asset.name === event.target.value) || assets[0]
    );
  };

  const handleFromValueChange = (
    event: React.ChangeEvent<HTMLInputElement>
    ) => {
      setFromAmount(Number(event.target.value));
    };
    
  const debounceQuoteCall = useCallback(debounce(getQuote, 500), []);

  useEffect(() => {
    debounceQuoteCall(fromAmount);
  }, [fromAmount, debounceQuoteCall]);

  async function getQuote(currentAmount: number) {
    if (isNaN(currentAmount) || currentAmount <= 0) {
      console.error('Invalid fromAmount value:', currentAmount);
      return;
    }

    const quote = await (
      await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${fromAsset.mint}&outputMint=${toAsset.mint}&amount=${currentAmount * Math.pow(10, fromAsset.decimals)}&slippage=0.5`
      )
    ).json();

    if (quote && quote.outAmount) {
      const outAmountNumber =
        Number(quote.outAmount) / Math.pow(10, toAsset.decimals);
      setToAmount(outAmountNumber);
    }

    setQuoteResponse(quote);
  }

  async function signAndSendTransaction() {
    if (!wallet.connected || !wallet.signTransaction) {
      console.error(
        'Wallet is not connected or does not support signing transactions'
      );
      return;
    }

    const { swapTransaction } = await (
      await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: wallet.publicKey?.toString(),
          wrapAndUnwrapSol: true,
        }),
      })
    ).json();

    try {
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      const signedTransaction = await wallet.signTransaction(transaction);

      const rawTransaction = signedTransaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2,
      });

      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txid
      }, 'confirmed');
      
      console.log(`https://solscan.io/tx/${txid}`);

    } catch (error) {
      console.error('Error signing or sending the transaction:', error);
    }
  }

  return (
    <div className={styles.body}>
      <div className={styles.innerContainer}>
        <div className={styles.inputContainer}>
          <div className={styles.labels}>You pay</div>
          <input
            type="number"
            value={fromAmount}
            onChange={handleFromValueChange}
            className={styles.inputField}
          />
          <select
            value={fromAsset.name}
            onChange={handleFromAssetChange}
            className={styles.selectField}
          >
            {assets.map((asset) => (
              <option key={asset.mint} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputContainer}>
          <div className={styles.labels}>You receive</div>
          <input
            type="number"
            value={toAmount}
            className={styles.inputField}
            readOnly
          />
          <select
            value={toAsset.name}
            onChange={handleToAssetChange}
            className={styles.selectField}
          >
            {assets.map((asset) => (
              <option key={asset.mint} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={signAndSendTransaction}
          className={styles.button}
          disabled={toAsset.mint === fromAsset.mint}
        >
          Swap
        </button>
      </div>
    </div>
  );
}

