import * as React from 'react';
import {
  transactionServices,
  useGetAccountInfo,
  useGetPendingTransactions,
  refreshAccount,
  useGetNetworkConfig,
  DappUI
} from '@elrondnetwork/dapp-core';
import {
  Address,
  AddressValue,
  ContractFunction,
  ProxyProvider,
  Query,
  SmartContract,
  Egld
} from '@elrondnetwork/erdjs';
import { contractAddress } from 'config';

const ContractInfo = () => {
  const { address, account } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const { network } = useGetNetworkConfig();
  const proxy = new ProxyProvider(network.apiAddress);
  const contract = new SmartContract({ address: new Address(contractAddress) });

  const [tokenId, setTokenId] = React.useState<string>();
  const [tokenPrice, setTokenPrice] = React.useState<number>();
  const [buyLimit, setBuyLimit] = React.useState<number>();

  React.useEffect(() => {
    // const query = new Query({
    //   address: new Address(contractAddress),
    //   func: new ContractFunction('getDistributableTokenId'),
    // });

    // proxy
    //   .queryContract(query)
    //   .then(({ returnData }) => {
    //     const [encoded] = returnData;
    //     const decoded = Buffer.from(encoded, 'base64').toString();
    //     setTokenId(decoded);
    //   })
    //   .catch((err) => {
    //     console.error('getDistributableTokenId failed.', err);
    //   });
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
    </div>
  );
};

export default ContractInfo;
