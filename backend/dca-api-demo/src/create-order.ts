import axios from "axios";
import { ethers } from "ethers";
import { BaseUrl, DCA_CONTRACT_ADDRESS } from "./const";
import { getSigner, checkTokenApproval, utils } from "./utils";

// EIP-712 types for the DCA order (openocean DCA Protocol v2)
const DCA_ORDER_EIP712_TYPES = {
  Order: [
    { name: "from", type: "address" },
    { name: "srcToken", type: "address" },
    { name: "dstToken", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "minReturn", type: "uint256" },
    { name: "amountAll", type: "uint256" },
    { name: "count", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "salt", type: "uint256" },
  ],
};

/**
 * Create DCA order using Ethers.js
 * Mirrors the frontend Dca.js createDcaOrder flow (with private key instead of wallet popup).
 * @param chainId chain id
 * @param inToken in token info { address, decimals, symbol, amount }
 * @param outToken out token info { address, decimals, symbol, amount }
 * @param dcaOptions dca options { time: interval seconds, times: number of trades, minPrice?, maxPrice? }
 * @returns order object
 */
export async function createEthers(
  chainId: string,
  inToken: { address: string; decimals: number; symbol: string; amount: number | string },
  outToken: { address: string; decimals: number; symbol: string; amount: number | string },
  dcaOptions: { time?: number; times?: number; minPrice?: number; maxPrice?: number } = {}
) {
  try {
    const { wallet, signer } = await getSigner(chainId);

    if (!utils.isNativeToken(inToken.address)) {
      const approvalAmount = BigInt(Number(inToken.amount));
      await checkTokenApproval(inToken.address, DCA_CONTRACT_ADDRESS, approvalAmount, wallet.address, signer);
    }

    const makerAmount = inToken.amount.toString();

    // Prepare DCA EIP-712 order parameters
    const dcaCount = Number(dcaOptions.times ?? 2);
    const dcaIntervalSeconds = Number(dcaOptions.time ?? 60);
    // Amount per trade = total amount / number of trades
    const amountIn = (BigInt(makerAmount) / BigInt(dcaCount)).toString();
    const bufferCount = dcaIntervalSeconds / 60 == 1 ? 1 : 0;
    const deadline = Math.floor(
      (Date.now() + dcaIntervalSeconds * (dcaCount + bufferCount) * 1000 + 120000) / 1000
    );
    const salt = ethers.toBigInt(ethers.randomBytes(32)).toString();

    const domain = {
      name: "openocean DCA Protocol",
      version: "2",
      chainId: Number(chainId),
      verifyingContract: DCA_CONTRACT_ADDRESS,
    };
    const value = {
      from: wallet.address,
      srcToken: ethers.getAddress(inToken.address),
      dstToken: ethers.getAddress(outToken.address),
      amountIn,
      minReturn: 1,
      amountAll: makerAmount,
      count: dcaCount,
      deadline,
      salt,
    };
    const orderHash = ethers.TypedDataEncoder.hash(domain, DCA_ORDER_EIP712_TYPES, value);
    const signature = await signer.signTypedData(domain, DCA_ORDER_EIP712_TYPES, value);

    const order: Record<string, any> = {
      makerAsset: inToken.address,
      takerAsset: outToken.address,
      makerAmount,
      orderHash,
      salt,
      deadline,
      signature,
      orderMaker: wallet.address,
      time: dcaIntervalSeconds,
      times: dcaCount,
      referrer: '',
      referrerFee: 0,
      enabledDexIds: '',
      disabledDexIds: ''
    };
    if (dcaOptions.minPrice && dcaOptions.maxPrice) {
      order.minPrice = dcaOptions.minPrice;
      order.maxPrice = dcaOptions.maxPrice;
    }

    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/dca/swap`,
      order,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Ethers.js create order result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Ethers.js create order failed:', error);
    throw error;
  }
}
