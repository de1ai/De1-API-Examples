import axios from "axios";
import { ethers } from "ethers";
import { SignatureTransfer } from "@uniswap/permit2-sdk";
import { BaseUrl, GASLESS_SPENDER } from "./const";
import { getSigner, checkTokenApproval, utils } from "./utils";
import Permit2Abi from "./abis/permit2Abi.json";
import OpenSwapPermitAbi from "./abis/openSwapPermitAbi.json";

const inToken = {
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  decimals: 6,
  symbol: "USDC",
  amount: "10000000",
};

const outToken = {
  address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
  decimals: 6,
  symbol: "USDT",
  amount: "10000000",
};

const PERMIT2_TRANSFER_FROM_SELECTOR = "0x30f28b7a";

/**
 * Get the De¹ gasless spender address for the chain.
 * Mirrors the frontend SwapGasless.js getPermit2Spender helper.
 */
export function getPermit2Spender(chainId: string | number) {
  return Number(chainId) === 10
    ? "0x8A468ff6b4d06535C05A47940865e70dc322a72b"
    : GASLESS_SPENDER;
}

/**
 * Convert a decimal amount to an integer string with the given decimals.
 * Mirrors the frontend SwapGasless.js amount2Decimals helper.
 */
function expandExponential(s: string): string {
  if (!/[eE]/.test(s)) return s;
  const [mantissa, expPart] = s.split(/[eE]/);
  const exp = parseInt(expPart, 10);
  const neg = mantissa.startsWith("-");
  const body = neg ? mantissa.slice(1) : mantissa;
  const [w, f = ""] = body.split(".");
  const digits = w + f;
  const point = w.length + exp;
  let out: string;
  if (point <= 0) out = "0." + "0".repeat(-point) + digits;
  else if (point >= digits.length) out = digits + "0".repeat(point - digits.length);
  else out = digits.slice(0, point) + "." + digits.slice(point);
  return (neg ? "-" : "") + out;
}

export function amount2Decimals(amount: any, decimals: number): string {
  const dec = Math.max(0, Math.floor(Number(decimals)) || 0);
  if (typeof amount === "string" && dec === 0 && /^\d+$/.test(amount.trim())) {
    return amount.trim().replace(/^0+(?=\d)/, "") || "0";
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0";
  const plain =
    Math.abs(value) >= 1e21 ? expandExponential(String(value)) : value.toFixed(Math.min(dec, 100));
  const [whole, frac = ""] = plain.split(".");
  const padded = (frac + "0".repeat(dec)).slice(0, dec);
  return (whole + padded).replace(/^0+(?=\d)/, "") || "0";
}

/**
 * EIP-712 types for the gasless swap order.
 * Mirrors the frontend SwapGasless.js GASLESS_SWAP_EIP712_TYPES.
 */
const GASLESS_SWAP_EIP712_TYPES = {
  Swap: [
    { name: "from", type: "address" },
    { name: "srcToken", type: "address" },
    { name: "dstToken", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "minReturnAmount", type: "uint256" },
    { name: "fee", type: "uint256" },
    { name: "gasFee", type: "uint256" },
    { name: "swapAddress", type: "address" },
    { name: "swapDataHash", type: "bytes32" },
    { name: "permitNonce", type: "uint256" },
    { name: "flag", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

/**
 * Sign the gasless order with EIP-712 typed data.
 * Mirrors the frontend SwapGasless.js signGaslessOrder helper.
 */
export async function signGaslessOrder(chainId: string, gasLessData: Record<string, any>) {
  const verifyingContract = getPermit2Spender(chainId);
  const domain = {
    name: "Gasless Protocol",
    version: "2",
    chainId: Number(chainId),
    verifyingContract,
  };
  const value = {
    from: ethers.getAddress(gasLessData.from),
    srcToken: ethers.getAddress(gasLessData.inToken),
    dstToken: ethers.getAddress(gasLessData.outToken),
    amountIn: amount2Decimals(gasLessData.amountDecimals, 0),
    minReturnAmount: amount2Decimals(gasLessData.minOutAmount || 0, 0),
    fee: amount2Decimals(gasLessData.feeAmount1 || 0, 0),
    gasFee: amount2Decimals(gasLessData.feeAmount2 || 0, 0),
    swapAddress: ethers.getAddress(gasLessData.to),
    swapDataHash: ethers.keccak256(gasLessData.data),
    permitNonce: amount2Decimals(gasLessData.nonce || 0, 0),
    flag: amount2Decimals(gasLessData.flag || 0, 0),
    deadline: amount2Decimals(gasLessData.deadline || 0, 0),
  };
  const orderHash = ethers.TypedDataEncoder.hash(domain, GASLESS_SWAP_EIP712_TYPES, value);
  const { wallet } = await getSigner(chainId);
  const signature = await wallet.signTypedData(domain, GASLESS_SWAP_EIP712_TYPES, value);
  return { orderHash, signature };
}


export async function getGasPrice(chainId: string) {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chainId}/gasPrice`,
    method: "GET",
  });
  const gasPrice = data?.without_decimals?.standard;
  console.log(`gasPrice is ${gasPrice} Gwei`);
  return gasPrice;
}

export async function getTokenList(chainId: string) {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chainId}/tokenList`,
    method: "GET",
  });
  const tokenList = data?.data;
  console.log(tokenList);
  return tokenList;
}

export async function quote(chainId: string) {
  const { data } = await axios.get(`${BaseUrl}/v4/gasless/${chainId}/quote`, {
    params: {
      inTokenAddress: inToken.address,
      outTokenAddress: outToken.address,
      amountDecimals: inToken.amount,
      gasPrice: 1,
      slippage: 1,
    },
  });
  console.log(data);
  return data;
}

/**
 * Read the next Permit2 nonce for an owner from the gasless spender contract.
 * Mirrors the frontend SwapGasless.js getPermit2Nonce helper.
 */
export async function getPermit2Nonce(chainId: string, account: string) {
  const { provider } = await getSigner(chainId);
  const contract = new ethers.Contract(GASLESS_SPENDER, OpenSwapPermitAbi, provider);
  const nonce = await contract.permit2NextNonce(account);
  console.log(`Permit2 nonce for ${account}: ${nonce.toString()}`);
  return nonce;
}

/**
 * Build the Permit2 typed-data and the encoded permitTransferFrom calldata.
 * Mirrors the frontend SwapGasless.js setPermit2Signer helper.
 */
export async function buildPermit2Signature(
  chainId: string,
  account: string,
  amount: string,
  tokenAddress: string,
  permit2Address: string
) {
  const { wallet } = await getSigner(chainId);
  const spender = getPermit2Spender(chainId);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 30; // 30 minutes from now

  const nonce = await getPermit2Nonce(chainId, account);

  const permitSingle = {
    permitted: {
      token: tokenAddress,
      amount,
    },
    spender,
    nonce,
    deadline,
  };

  const { domain, types, values } = SignatureTransfer.getPermitData(
    permitSingle,
    permit2Address,
    Number(chainId)
  );

  // Normalize the ethers-v5-shaped domain (chainId: BigNumberish, salt: Bytes)
  // returned by @uniswap/permit2-sdk to ethers-v6 shape (chainId: number, salt: BytesLike|null).
  const domainV6 = {
    ...domain,
    chainId: domain.chainId != null ? Number(domain.chainId.toString()) : 0,
    salt: domain.salt ? ethers.hexlify(domain.salt as any) : undefined,
  } as ethers.TypedDataDomain;

  const signature = await wallet.signTypedData(domainV6, types, values);

  const permitTransferFromData = [
    [[tokenAddress, amount], nonce, deadline],
    [spender, amount],
    account,
    signature,
  ];

  const PERMIT2_INTERFACE = new ethers.Interface(Permit2Abi as any);
  const data = PERMIT2_INTERFACE.encodeFunctionData(
    PERMIT2_TRANSFER_FROM_SELECTOR,
    permitTransferFromData
  );

  return { permit: data, nonce, deadline, spender, signature };
}

/**
 * Execute gasless swap using a private key.
 * Mirrors the frontend SwapGasless.js handleSwap flow, but with a private key
 * signing both the Permit2 typed-data and (when needed) approving the input token.
 */
export async function gaslessSwap(chainId: string, chainName: string = "base") {
  const { wallet } = await getSigner(chainId);

  const gasPrice = await getGasPrice(chainId);

  const params = {
    inTokenAddress: inToken.address,
    outTokenAddress: outToken.address,
    slippage: 1,
    amountDecimals: inToken.amount,
    gasPrice,
    account: wallet.address,
  };

  const { data } = await axios({
    url: `${BaseUrl}/v4/gasless/${chainId}/quote`,
    method: "GET",
    params,
  });
  console.log("Gasless quote:", data);

  const quoteData = data?.data;
  if (!quoteData || !quoteData.data || !quoteData.to) {
    throw new Error("Invalid gasless quote response from API");
  }

  const { inAmount, data: txData, to, fees, flags, hash, minOutAmount } = quoteData;
  const inTokenAddress = inToken.address;

  const permit2Address = utils.getPermit2Address(chainName);

  if (!utils.isNativeToken(inTokenAddress)) {
    const approvalAmount = BigInt(inToken.amount);
    await checkTokenApproval(inTokenAddress, permit2Address, approvalAmount, wallet.address, wallet);
  }

  const { permit, nonce, deadline } = await buildPermit2Signature(
    chainId,
    wallet.address,
    inAmount,
    inTokenAddress,
    permit2Address
  );

  const gaslessBody: Record<string, any> = {
    from: wallet.address,
    to,
    data: txData,
    amountDecimals: params.amountDecimals,
    feeAmount1: fees?.[0] ? amount2Decimals(fees[0].inFeeAmount, Number(fees[0].decimals)) : 0,
    feeAmount2: fees?.[1] ? amount2Decimals(fees[1].inFeeAmount, Number(fees[1].decimals)) : 0,
    ceilingFee: fees?.[0]?.ceiling_fee
      ? amount2Decimals(fees[0].ceiling_fee, Number(fees[0].decimals))
      : 0,
    minOutAmount: minOutAmount || 0,
    flag: flags,
    gasPriceDecimals: gasPrice,
    deadline,
    inToken: inTokenAddress,
    outToken: outToken.address,
    nonce: Number(nonce),
    permit,
    usd_valuation: Number(
      (
        (Number(inToken.amount) / 10 ** inToken.decimals) *
        Number(quoteData.inToken?.usd || quoteData.inToken?.price || 0)
      ).toFixed(4)
    ),
    hash: hash || "",
  };

  // Sign the gasless order (EIP-712) before submitting
  const signedOrder = await signGaslessOrder(chainId, gaslessBody);
  gaslessBody.orderHash = signedOrder.orderHash;
  gaslessBody.signature = signedOrder.signature;

  const { data: swapRes } = await axios.post(
    `${BaseUrl}/v4/gasless/${chainId}/swap`,
    gaslessBody
  );

  if (!swapRes?.orderHash) {
    throw new Error(swapRes?.msg || swapRes?.err || "Gasless swap submission failed");
  }

  console.log("Gasless swap order hash:", swapRes.orderHash);
  const txHash = await pollOrderHash(chainId, swapRes.orderHash, 0);
  if (!txHash) {
    throw new Error("Timed out waiting for gasless swap tx hash");
  }

  console.log("Gasless swap tx hash:", txHash);
  return txHash;
}

/**
 * Poll the gasless order endpoint until the on-chain tx hash is available.
 * Mirrors the frontend SwapGasless.js getGasHashTimeout helper.
 */
export async function pollOrderHash(
  chainId: string,
  orderHash: string,
  retry: number = 0,
  maxRetries: number = 30
): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  try {
    const { data } = await axios.get(
      `${BaseUrl}/v4/gasless/${chainId}/order`,
      { params: { orderHash } }
    );
    const orderData = data?.data;
    if (!orderData) {
      throw new Error(data?.msg || "No data received");
    }
    if (orderData.err) {
      throw new Error(orderData.err);
    }
    if (orderData.hash) {
      return orderData.hash;
    }
  } catch (error) {
    console.error("Error polling gasless order hash:", (error as Error).message);
  }

  if (retry >= maxRetries) return null;
  return pollOrderHash(chainId, orderHash, retry + 1, maxRetries);
}
