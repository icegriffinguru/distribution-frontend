import * as React from 'react';
import {
  transactionServices,
  useGetAccountInfo,
  useGetPendingTransactions,
  refreshAccount,
  useGetNetworkConfig,
  DappUI,
  getAccountProvider
} from '@elrondnetwork/dapp-core';
import {
  Address,
  AddressValue,
  Nonce,
  ContractFunction,
  ProxyProvider,
  WalletProvider,
  Query,
  SmartContract,
  Egld,
  GasLimit,
  BigUIntValue,
  Balance
} from '@elrondnetwork/erdjs';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js/bignumber.js';
import { contractAddress } from 'config';

const ContractInfo = () => {
  const { address, account } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const { network } = useGetNetworkConfig();
  const proxy = new ProxyProvider(network.apiAddress);
  const contract = new SmartContract({ address: new Address(contractAddress) });
  const { sendTransactions } = transactionServices;

  console.log('network', network);

  const /*transactionSessionId*/ [, setTransactionSessionId] = React.useState<string | null>(null);

  const [tokenId, setTokenId] = React.useState<string>();
  const [tokenPrice, setTokenPrice] = React.useState<number>();
  const [buyLimit, setBuyLimit] = React.useState<number>();

  const [newTokenPrice, setNewTokenPrice] = React.useState<number>();
  const [newBuyLimit, setNewBuyLimit] = React.useState<number>();

  React.useEffect(() => {
    let query, decoded;

    query = new Query({
      address: new Address(contractAddress),
      func: new ContractFunction('getDistributableTokenId')
    });
    proxy
      .queryContract(query)
      .then(({ returnData }) => {
        const [encoded] = returnData;
        decoded = Buffer.from(encoded, 'base64').toString();
        setTokenId(decoded);
      })
      .catch((err) => {
        console.error('Unable to call VM query', err);
      });

    query = new Query({
      address: new Address(contractAddress),
      func: new ContractFunction('getDistributablePrice')
    });
    proxy
      .queryContract(query)
      .then(({ returnData }) => {
        const [encoded] = returnData;
        decoded = Buffer.from(encoded, 'base64').toString('hex');
        decoded = parseInt(decoded, 16);
        decoded = Egld.raw(decoded).toDenominated();
        decoded = parseFloat(decoded);
        setTokenPrice(decoded);
      })
      .catch((err) => {
        console.error('Unable to call VM query', err);
      });

    query = new Query({
      address: new Address(contractAddress),
      func: new ContractFunction('getBuyLimit')
    });
    proxy
      .queryContract(query)
      .then(({ returnData }) => {
        const [encoded] = returnData;
        decoded = Buffer.from(encoded, 'base64').toString('hex');
      decoded = parseInt(decoded, 16);
      setBuyLimit(decoded);
      })
      .catch((err) => {
        console.error('Unable to call VM query', err);
      });
  }, [hasPendingTransactions]);

  const sendUpdatePriceTransaction = async (e: any) => {
    e.preventDefault();
    if (!newTokenPrice){
      alert('Token price should be greater than 0.');
      return;
    }

    const tx = contract.call({
      func: new ContractFunction('updatePrice'),
      gasLimit: new GasLimit(5000000),
      args: [new BigUIntValue(Balance.egld(newTokenPrice).valueOf())]
    });

    await refreshAccount();

    const txName = 'updatePrice';
    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + txName + ' transaction',
        errorMessage: 'An error has occured during ' + txName,
        successMessage: txName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
  };

  const sendUpdateBuyLimitTransaction = async (e: any) => {
    e.preventDefault();
    if (newBuyLimit !== 0 && !newBuyLimit){
      alert('Buy Limit should be set.');
      return;
    }

    const tx = contract.call({
      func: new ContractFunction('updateBuyLimit'),
      gasLimit: new GasLimit(5000000),
      args: [new BigUIntValue(new BigNumber(newBuyLimit))]
    });

    await refreshAccount();

    const txName = 'updateBuyLimit';
    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + txName + ' transaction',
        errorMessage: 'An error has occured during ' + txName,
        successMessage: txName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
  };

  return (
    <div className='text-white' data-testid='topInfo'>
      <hr />
      <div>
        <h3 className='py-2'>
          Contract Information
        </h3>
      </div>
      <div className='mb-1'>
        <span className='opacity-6 mr-1'>Token Id:</span>
        <span data-testid='tokenId'> {tokenId}</span>
      </div>
      <div className='mb-1'>
        <span className='opacity-6 mr-1'>Token Price:</span>
        <span data-testid='tokenPrice'> {tokenPrice} EGLD</span>
      </div>
      <div className='mb-4'>
        <span className='opacity-6 mr-1'>Buy Limit:</span>
        <span data-testid='buyLimit'> {buyLimit}</span>
      </div>
      <hr />
      <div className='mb-1' >
        <span className='opacity-6 mr-1'>Price:</span>
        <input type="number" onChange={(e) => setNewTokenPrice(parseFloat(e.target.value))} />
        <button className='btn' onClick={sendUpdatePriceTransaction}>Update</button>
      </div>
      <div className='mb-1' >
        <span className='opacity-6 mr-1'>Buy Limit:</span>
        <input type="number" onChange={(e) => setNewBuyLimit(parseFloat(e.target.value))} />
        <button className='btn' onClick={sendUpdateBuyLimitTransaction}>Update</button>
      </div>
    </div>
  );
};

export default ContractInfo;
