import { config as dotenvConfig } from "dotenv";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

dotenvConfig();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      accounts: {
        count: 30, // F-09/F-10 임계값 테스트에 충분한 계정 수 (20명 베팅자 + owner + 예비)
      },
    },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    metadiumTestnet: {
      type: "http",
      url: "https://api.metadium.com/dev",
      chainId: 12,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    metadiumMainnet: {
      type: "http",
      url: "https://api.metadium.com/prod",
      chainId: 11,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};
