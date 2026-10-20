import { getGasPrice, getTokenList, quote } from "./lib"; // gaslessSwap
import { PrivateKey } from "./const";
import { ethers } from "ethers";

const chainId = "8453";
// const chainName = "base";
const account = new ethers.Wallet(PrivateKey).address;

// Test cases
async function runTests() {
  try {
    console.log("Starting tests...");

    console.log("\nTesting getGasPrice:");
    await getGasPrice(chainId);

    console.log("\nTesting getTokenList:");
    await getTokenList(chainId);

    console.log("\nTesting quote:");
    await quote(chainId);

    console.log("\nTesting gaslessSwap (uncomment to run):");
    // await gaslessSwap(chainId, chainName);

    console.log("\nAll tests completed!");
    console.log(`Wallet address: ${account}`);
  } catch (error) {
    console.error("Error during testing:", error);
  }
}

runTests();
