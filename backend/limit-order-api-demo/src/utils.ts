import { ethers } from "ethers";
import { RPCS, PrivateKey, NATIVE_TOKEN_ADDRESSES, ERC20_ABI } from "./const";

export const utils = {
  isNativeToken: (address: string): boolean => {
    if (!address) return true;
    const addr = address.toLowerCase();
    return NATIVE_TOKEN_ADDRESSES.includes(addr);
  },

  getLimitContractAddress: (_chainName: string): string => {
    // De¹ limit order contract address (unified across chains)
    return "0xC9d8Eaf3D32cACe17AAfa7D290533E280f2fF137";
  }
};

export async function getSigner(chainId: string) {
  const provider = new ethers.JsonRpcProvider(RPCS[chainId]);
  const wallet = new ethers.Wallet(PrivateKey, provider);
  return { provider, wallet, signer: wallet };
}

export async function checkTokenApproval(
  tokenAddress: string,
  contractAddress: string,
  amount: bigint,
  account: string,
  signer: ethers.Signer
): Promise<boolean> {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const currentAllowance: bigint = await tokenContract.allowance(account, contractAddress);
  if (currentAllowance < amount) {
    const tx = await tokenContract.approve(contractAddress, ethers.MaxUint256);
    await tx.wait();
    console.log('Token approval successful:', tx.hash);
    return true;
  }
  return true;
}
