module.exports = {
  contracts_directory: "./constracts_null",
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8546, // forked Geth node is listening port 8546. 8545 is location of forked node
      network_id: "*", // Match any network id
      // gas: 5000000
    }
  }
};
