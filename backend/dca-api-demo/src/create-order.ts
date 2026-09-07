import axios from "axios";
import { BaseUrl, DCA_CONTRACT_ADDRESS } from "./const";
import { getSigner, checkTokenApproval, utils } from "./utils";

/**
 * Create DCA order using Ethers.js
 * Mirrors the frontend Dca.js createDcaOrder flow (with private key instead of wallet popup).
 * @param chainId chain id
 * @param inToken in token info { address, decimals, symbol, amount }
 * @param outToken out token info { address, decimals, symbol, amount }
 * @returns order object
 */
export async function createEthers(
  chainId: string,
  inToken: { address: string; decimals: number; symbol: string; amount: number | string },
  outToken: { address: string; decimals: number; symbol: string; amount: number | string }
) {
  try {
    const { wallet, signer } = await getSigner(chainId);

    if (!utils.isNativeToken(inToken.address)) {
      const approvalAmount = BigInt(Number(inToken.amount));
      await checkTokenApproval(inToken.address, DCA_CONTRACT_ADDRESS, approvalAmount, wallet.address, signer);
    }

    const makerAmount = inToken.amount.toString();

    const message = `makerAsset:\n${inToken.address}\ntakerAsset:\n${outToken.address}\nmakerAmount:\n${makerAmount}`;
    const signature = await signer.signMessage(message);

    const order = {
      makerAsset: inToken.address,
      takerAsset: outToken.address,
      makerAmount,
      orderMaker: wallet.address,
      signature,
      minPrice: 0,
      maxPrice: 0,
      time: 60,
      times: 2,
      referrer: '',
      referrerFee: 0,
      enabledDexIds: '',
      disabledDexIds: ''
    };

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
