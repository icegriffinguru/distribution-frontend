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
    (async () => {
      let queryResponse, decoded;
      queryResponse = await contract.runQuery(proxy, {
        func: new ContractFunction('getDistributableTokenId')
      });
      decoded = Buffer.from(queryResponse.returnData[0], 'base64').toString();
      setTokenId(decoded);

      queryResponse = await contract.runQuery(proxy, {
        func: new ContractFunction('getDistributablePrice')
      });
      decoded = Buffer.from(queryResponse.returnData[0], 'base64').toString('hex');
      decoded = parseInt(decoded, 16);
      decoded = Egld.raw(decoded).toDenominated();
      decoded = parseFloat(decoded);
      setTokenPrice(decoded);

      queryResponse = await contract.runQuery(proxy, {
        func: new ContractFunction('getBuyLimit')
      });
      decoded = Buffer.from(queryResponse.returnData[0], 'base64').toString('hex');
      decoded = parseInt(decoded, 16);
      setBuyLimit(decoded);
    })();
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

    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing Ping transaction',
        errorMessage: 'An error has occured during Ping',
        successMessage: 'Ping transaction successful'
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
    </div>
  );
};

export default ContractInfo;
