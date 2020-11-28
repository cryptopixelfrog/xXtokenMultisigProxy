const xXtoken = artifacts.require("xXtoken");
const xXtokenV2 = artifacts.require("xXtokenV2");
const multiSigWallet = artifacts.require("MultiSigWallet");
const myProxy = artifacts.require("myProxy");

module.exports = async function (deployer) {

  await deployer.deploy(xXtoken);
  const _xXtoken = await xXtoken.deployed();

  await deployer.deploy(xXtokenV2);
  const _xXtokenV2 = await xXtokenV2.deployed();

  await deployer.deploy(multiSigWallet);
  const _multiSigWallet = await multiSigWallet.deployed();

  // pass the main token sc address and param.
  await deployer.deploy(
    myProxy,
    _xXtoken.address
  );
  const _myProxy = await myProxy.deployed();

  // seond deploy of the proxy with v2 token sc address.
  await deployer.deploy(
    myProxy,
    _xXtokenV2.address
  );
  const _myProxy = await myProxy.deployed();

  console.log("Deployed xXtoken => ", _xXtoken.address);
  console.log("Deployed xXtokenV2 => ", _xXtokenV2.address);
  console.log("Deployed multiSigWallet => ", _multiSigWallet.address);
  console.log("Deployed myProxy => ", _myProxy.address);
};
