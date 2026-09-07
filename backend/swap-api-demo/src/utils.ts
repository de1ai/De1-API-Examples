import { ethers } from "ethers";
import { RPCS, PrivateKey, NATIVE_TOKEN_ADDRESSES } from "./const";

export const utils = {
  isNativeToken: (address: string): boolean => {
    if (!address) return true;
    const addr = address.toLowerCase();
    return NATIVE_TOKEN_ADDRESSES.includes(addr);
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
  const erc20Abi = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
  const currentAllowance: bigint = await tokenContract.allowance(account, contractAddress);
  if (currentAllowance < amount) {
    const tx = await tokenContract.approve(contractAddress, ethers.MaxUint256);
    await tx.wait();
    console.log('Token approval successful:', tx.hash);
    return true;
  }
  return true;
}
