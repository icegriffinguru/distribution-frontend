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
  Balance,
  BytesValue,
  ArgSerializer,
  TransactionPayload
} from '@elrondnetwork/erdjs';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js/bignumber.js';
import {
  stringToHex,
  decimalToHex
} from '../../utils/encode';
import  {
  getEsdtBalance
} from 'apiRequests';
import { contractAddress, gatewayUrl } from 'config';

const ContractInfo = () => {
  const { address, account } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const { network } = useGetNetworkConfig();
  const proxy = new ProxyProvider(network.apiAddress);
  const contract = new SmartContract({ address: new Address(contractAddress) });
  const { sendTransactions } = transactionServices;

  // console.log('network', network);

  const /*transactionSessionId*/ [transactionSessionId, setTransactionSessionId] = React.useState<string | null>(null);

  const [tokenId, setTokenId] = React.useState<string>();
  const [tokenPrice, setTokenPrice] = React.useState<number>();
  const [buyLimit, setBuyLimit] = React.useState<number>();
  const [esdtBalance, setEsdtBalance] = React.useState<string>();
  const [accountEsdtBalance, setAccountEsdtBalance] = React.useState<string>();

  const [newTokenPrice, setNewTokenPrice] = React.useState<number>();
  const [newBuyLimit, setNewBuyLimit] = React.useState<number>();
  const [depositAmount, setDepositAmount] = React.useState<number>();
  const [claimDistributableAmount, setClaimDistributableAmount] = React.useState<number>();
  const [buyAmount, setBuyAmount] = React.useState<number>();
  const [burnAmount, setBurnAmount] = React.useState<number>();

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

  React.useEffect(() => {
    if (!tokenId) return;
    console.log('tokenId', tokenId);

    // contract balance
    getEsdtBalance({
      apiAddress: gatewayUrl,
      address: contractAddress,
      tokenId: tokenId,
      timeout: 3000
    }).then(({ data, success }) => {
      console.log('success', success);
      console.log('data', data);
      if (success && !!data.tokenData) {
        let decoded;
        decoded = data.tokenData.balance;
        decoded = Egld.raw(new BigNumber(decoded)).toDenominated();
        decoded = parseFloat(decoded).toString();

        const tokenSymbol = tokenId.split('-')[0];

        decoded += ' ' + tokenSymbol;
        console.log('decoded', decoded);
        setEsdtBalance(decoded);
      }
    });

    // acccount balance
    getEsdtBalance({
      apiAddress: gatewayUrl,
      address: address,
      tokenId: tokenId,
      timeout: 3000
    }).then(({ data, success }) => {
      console.log('success', success);
      console.log('data', data);
      if (success && !!data.tokenData) {
        let decoded;
        decoded = data.tokenData.balance;
        decoded = Egld.raw(new BigNumber(decoded)).toDenominated();
        decoded = parseFloat(decoded).toString();

        const tokenSymbol = tokenId.split('-')[0];

        decoded += ' ' + tokenSymbol;
        console.log('decoded', decoded);
        setAccountEsdtBalance(decoded);
      }
    });
  }, [tokenId, hasPendingTransactions]);

  const sendUpdatePriceTransaction = async (e: any) => {
    e.preventDefault();
    if (!newTokenPrice){
      alert('Token price should be greater than 0.');
      return;
    }

    const functionName = 'updatePrice';
    const tx = contract.call({
      func: new ContractFunction(functionName),
      gasLimit: new GasLimit(5000000),
      args: [new BigUIntValue(Balance.egld(newTokenPrice).valueOf())]
    });

    await refreshAccount();

    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
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

    const functionName = 'updateBuyLimit';
    const tx = contract.call({
      func: new ContractFunction(functionName),
      gasLimit: new GasLimit(5000000),
      args: [new BigUIntValue(new BigNumber(newBuyLimit))]
    });

    await refreshAccount();

    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
  };

  const sendDepositTransaction = async (e: any) => {
    e.preventDefault();
    if (!depositAmount){
      alert('Deposit amount should be greater than 0.');
      return;
    }
    if (!tokenId){
      alert('Token Id is undefined.');
      return;
    }

    const functionName = 'deposit';

    // ESDTTransfer data args
    // ref: https://docs.elrond.com/developers/esdt-tokens/#transfers-to-a-smart-contract
    const args = [
      BytesValue.fromUTF8(tokenId),
      new BigUIntValue(Balance.egld(depositAmount).valueOf()),
      BytesValue.fromUTF8(functionName)
    ];
    const { argumentsString } = (new ArgSerializer()).valuesToString(args);
    const data = 'ESDTTransfer@' + argumentsString;

    // const data = `ESDTTransfer@${stringToHex(tokenId)}@${decimalToHex(Balance.egld(depositAmount).valueOf())}@${stringToHex(functionName)}`;

    const tx = {
      value: '0',
      data: data,   // because of data, transaction modal do not disapper after completion of the transaction
      receiver: contractAddress
    };

    await refreshAccount();

    const { sessionId , error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
    if (error) {
      console.error('sendDepositTransaction', error);
    }
  };

  const sendClaimTransaction = async (e: any) => {
    e.preventDefault();
    
    const functionName = 'claim';

    const tx = contract.call({
      func: new ContractFunction(functionName),
      gasLimit: new GasLimit(5000000)
    });

    await refreshAccount();

    const { sessionId , error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
    if (error) {
      console.error('sendDepositTransaction', error);
    }
  };

  const sendClaimDistirbutableTransaction = async (e: any) => {
    e.preventDefault();
    if (claimDistributableAmount !== 0 && !claimDistributableAmount){
      alert('claimDistributableAmount should be set.');
      return;
    }

    const functionName = 'claimDistributable';
    const tx = contract.call({
      func: new ContractFunction(functionName),
      gasLimit: new GasLimit(5000000),
      args: [new BigUIntValue(Balance.egld(claimDistributableAmount).valueOf())]
    });

    await refreshAccount();

    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
  };

  const sendBuyTransaction = async (e: any) => {
    e.preventDefault();
    if (!buyAmount || buyAmount <= 0){
      alert('Buy Amount should be greater than 0.');
      return;
    }

    const functionName = 'buy';
    const tx = contract.call({
      func: new ContractFunction(functionName),
      gasLimit: new GasLimit(5000000),
      value: Balance.egld(buyAmount)
    });

    await refreshAccount();

    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
  };

  const sendBurnTransaction = async (e: any) => {
    e.preventDefault();
    if (!burnAmount || burnAmount <= 0){
      alert('Burn amount shuould be greater than 0.');
      return;
    }

    const functionName = 'burn';
    const tx = contract.call({
      func: new ContractFunction(functionName),
      gasLimit: new GasLimit(5000000),
      args: [new BigUIntValue(Balance.egld(burnAmount).valueOf())]
    });

    await refreshAccount();

    const { sessionId /*, error*/ } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
      },
      redirectAfterSign: false
    });
    if (sessionId != null) {
      setTransactionSessionId(sessionId);
    }
  };

  const sendAllowLocalBurnTransaction = async (e: any) => {
    e.preventDefault();
    if (!tokenId){
      alert('Token Id is undefined.');
      return;
    }

    const functionName = 'sendAllowLocalBurnTransaction';

    // setSpecialRole data args
    // ref: https://docs.elrond.com/developers/esdt-tokens/#setting-and-unsetting-special-roles
    const args = [
      BytesValue.fromUTF8(tokenId),
      new AddressValue(new Address(contractAddress)),
      BytesValue.fromUTF8('ESDTRoleLocalBurn')
    ];
    const { argumentsString } = (new ArgSerializer()).valuesToString(args);
    const data = 'setSpecialRole@' + argumentsString;

    const EsdtManagerAddress = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u';
    const tx = {
      value: '0',
      data: data,   // because of data, transaction modal do not disapper after completion of the transaction
      receiver: EsdtManagerAddress
    };

    await refreshAccount();

    const { sessionId , error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: 'Processing ' + functionName + ' transaction',
        errorMessage: 'An error has occured during ' + functionName,
        successMessage: functionName + ' transaction successful'
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
          Account Information
        </h3>
      </div>
      <div className='mb-4'>
        <span className='opacity-6 mr-1'>ESDT Balance:</span>
        <span data-testid='accountEsdtBalance'> {accountEsdtBalance}</span>
      </div>

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
      <div className='mb-1'>
        <span className='opacity-6 mr-1'>Buy Limit:</span>
        <span data-testid='buyLimit'> {buyLimit}</span>
      </div>
      <div className='mb-4'>
        <span className='opacity-6 mr-1'>ESDT Balance:</span>
        <span data-testid='esdtBalance'> {esdtBalance}</span>
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

      <hr />
      <div className='mb-1' >
        <span className='opacity-6 mr-1'>Deposit Amount (In ESDT):</span>
        <input type="number" onChange={(e) => setDepositAmount(parseFloat(e.target.value))} />
        <button className='btn' onClick={sendDepositTransaction}>Send</button>
      </div>
      <div className='mb-1' >
        <button className='btn' onClick={sendClaimTransaction}>Claim</button>
      </div>
      <div className='mb-4' >
        <span className='opacity-6 mr-1'>Claim Distributable Amount (In ESDT):</span>
        <input type="number" onChange={(e) => setClaimDistributableAmount(parseFloat(e.target.value))} />
        <button className='btn' onClick={sendClaimDistirbutableTransaction}>Claim</button>
      </div>

      <hr />
      <div className='mb-1' >
        <button className='btn' onClick={sendAllowLocalBurnTransaction}>Allow Local Burn</button>
      </div>
      <div className='mb-4' >
        <span className='opacity-6 mr-1'>Burn Amount:</span>
        <input type="number" onChange={(e) => setBurnAmount(parseFloat(e.target.value))} />
        <button className='btn' onClick={sendBurnTransaction}>Burn</button>
      </div>

      <hr />
      <div className='mb-1' >
        <span className='opacity-6 mr-1'>Buy Amount (In EGLD):</span>
        <input type="number" onChange={(e) => setBuyAmount(parseFloat(e.target.value))} />
        <button className='btn' onClick={sendBuyTransaction}>Buy</button>
      </div>
    </div>
  );
};

export default ContractInfo;
