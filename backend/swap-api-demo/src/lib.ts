import axios from "axios";
import { ethers } from "ethers";
import { BaseUrl, ApproveContract } from "./const";
import { getSigner, checkTokenApproval, utils } from "./utils";

const inToken = {
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  decimals: 6,
  symbol: "USDC",
  amount: '10000000',
};

const outToken = {
  address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
  decimals: 6,
  symbol: "USDT",
  amount: '10000000',
};

export async function getGasPrice(chainId: string) {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chainId}/gasPrice`,
    method: 'GET',
  });
  const gasPrice = data?.without_decimals?.standard;
  console.log(`gasPrice is ${gasPrice} Gwei`);
  return gasPrice;
}

export async function getTokenList(chainId: string) {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chainId}/tokenList`,
    method: 'GET',
  });
  const tokenList = data?.data;
  console.log(tokenList);
  return tokenList;
}

export async function getAllowance(chainId: string, account: string, inTokenAddress: string) {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chainId}/allowance`,
    method: 'GET',
    params: {
      account,
      inTokenAddress
    }
  });
  console.log(data);
  return data?.data?.[0]?.allowance ?? 0;
}

export async function approve(chainId: string, tokenAddress: string, spender: string = ApproveContract) {
  const { signer } = await getSigner(chainId);
  const erc20Abi = [
    "function approve(address spender, uint256 amount) returns (bool)"
  ];
  const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);
  try {
    const tx = await contract.approve(spender, ethers.MaxUint256);
    await tx.wait();
    console.log('Approve tx:', tx.hash);
    return tx;
  } catch (error) {
    return error;
  }
}

export async function quote(chainId: string) {
  const { data } = await axios.get(`${BaseUrl}/v4/${chainId}/quote`, {
    params: {
      inTokenAddress: inToken.address,
      outTokenAddress: outToken.address,
      amountDecimals: inToken.amount,
      gasPrice: 1,
      slippage: 1,
    }
  });
  console.log(data);
  return data;
}

/**
 * Execute swap using private key
 * Mirrors the frontend Swap.js handleSwap flow, but with a private key signing the transaction.
 */
export async function swap(chainId: string) {
  const { wallet, signer } = await getSigner(chainId);

  const gasPrice = await getGasPrice(chainId);

  const params = {
    inTokenAddress: inToken.address,
    outTokenAddress: outToken.address,
    slippage: 1,
    amountDecimals: inToken.amount,
    gasPrice,
    account: wallet.address
  };

  const { data } = await axios({
    url: `${BaseUrl}/v4/${chainId}/swap`,
    method: 'GET',
    params
  });
  console.log('Swap quote:', data);

  const swapData = data?.data;
  if (!swapData || !swapData.data || !swapData.to) {
    throw new Error('Invalid swap response from API');
  }

  const { inToken: inTokenObj, inAmount, data: txData, to, gasPrice: swapGasPrice } = swapData;
  const inTokenAddr = inTokenObj.address;

  const txParams: ethers.TransactionLike = {
    from: wallet.address,
    to,
    data: txData,
    gasPrice: swapGasPrice ? BigInt(swapGasPrice) : BigInt(gasPrice)
  };

  if (utils.isNativeToken(inTokenAddr)) {
    txParams.value = BigInt(inAmount);
  } else {
    const approvalAmount = BigInt(inToken.amount);
    await checkTokenApproval(inTokenAddr, to, approvalAmount, wallet.address, signer);
  }

  const tx = await signer.sendTransaction(txParams);
  console.log('Swap tx submitted:', tx.hash);
  const receipt = await tx.wait();
  console.log('Swap tx confirmed:', receipt);
  return receipt;
}
