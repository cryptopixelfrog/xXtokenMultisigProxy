const BigNumber = require('bignumber.js');
const Web3EthAbi = require('web3-eth-abi');


const xXtoken = artifacts.require("xXtoken");
const xXtokenV2 = artifacts.require("xXtokenV2");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const myProxy = artifacts.require("myProxy");

// multisig and proxy deployers
const deployMultisig = (owners, confirmations) => {
  return MultiSigWallet.new(owners, confirmations);
}
const deployProxy = () => {
  return myProxy.new();
}

const MULTISIGWALLET_ABI = {
        addOwner: {
            name: 'addOwner',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'owner'
            }]
        },
        removeOwner: {
            name: 'removeOwner',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'owner'
            }]
        },
        replaceOwner: {
            name: 'replaceOwner',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'owner'
            }, {
                type: 'address',
                name: 'newOwner'
            }]
        },
        changeRequirement: {
            name: 'changeRequirement',
            type: 'function',
            inputs: [{
                type: 'uint256',
                name: 'required'
            }]
        }
    };


contract('xXtoken', function(accounts) {

  let requiredCfmNum = 3;
  let owners = [accounts[0], accounts[1], accounts[2], accounts[3]];
  let sender = accounts[1];
  let receiver = accounts[9];
  let newMember = accounts[4];
  let myProxyInst;

  before('Setup contract for each test', async () => {
    xXtokenInst = await xXtoken.new();
    console.log("xXtokenInst contract address: ", xXtokenInst.address);
    xXtokenAddr = xXtokenInst.address;
    assert.isOk(xXtokenInst, "xXtokenInst deployed");

    xXtokenV2Inst = await xXtokenV2.new();
    console.log("xXtokenV2Inst contract address: ", xXtokenV2Inst.address);
    xXtokenV2Addr = xXtokenV2Inst.address;
    assert.isOk(xXtokenV2Inst, "xXtokenV2Inst deployed");

    multiSigWalletInst = await deployMultisig(owners, requiredCfmNum);
    console.log("multiSigWalletInst contract address: ", multiSigWalletInst.address);
    multiSigWalletAddr = multiSigWalletInst.address;
    assert.isOk(multiSigWalletInst, "multiSigWalletInst deployed");

    myProxyInst = await deployProxy();
    assert.isOk(myProxyInst, "myProxyInst deployed");
  });


  it("Initalize and mint xXtoken", async () => {
    let init = await xXtokenInst.initialize("xXtoken", "XXTK", 18, web3.utils.toHex(new BigNumber(100*10**18)));
    let balanceOf = await xXtokenInst.balanceOf(accounts[0]);
    console.log("Total xXtoken Balance:", balanceOf.toString());
    assert.equal(web3.utils.fromWei(balanceOf.toString()), 100, "100 wasn't in the first account");
  })


  it("Check multiSigWallet owners", async () => {
    let ownersOut = await multiSigWalletInst.getOwners();
    console.log(owners);
    assert.deepEqual(owners.sort(), ownersOut.sort());
  })


  it("Send ETH to multiSigWallet", async () => {
    let senderBal = await web3.eth.getBalance(sender);
    let walletBal = await web3.eth.getBalance(multiSigWalletAddr);
    assert.equal(walletBal, 0);

    let value = 100;
    let tx = await multiSigWalletInst.sendTransaction({
      from: sender,
      value: value
    });

    let walletBalAfter = await web3.eth.getBalance(multiSigWalletAddr);
    console.log(walletBalAfter, value);
    assert.equal(walletBalAfter,value);
  })


  it("Send XXTK to multiSigWallet", async () => {
    let tokenValue = 200;
    let senderBal = await xXtokenInst.balanceOf(sender);
    assert.equal(senderBal, 0);
    await xXtokenInst.transfer(sender, tokenValue,);
    let senderBalAfter = await xXtokenInst.balanceOf(sender);
    assert.equal(senderBalAfter.toString(), tokenValue);

    let walletBal = await xXtokenInst.balanceOf(multiSigWalletAddr);
    assert.equal(walletBal, 0);
    await xXtokenInst.transfer(multiSigWalletAddr, tokenValue, {
      from: sender
    });
    let walletBalAfter = await xXtokenInst.balanceOf(multiSigWalletAddr);
    console.log(walletBalAfter.toString(), tokenValue);
    assert.equal(walletBalAfter.toString(), tokenValue);
  })


  it("Add new owner to multisigwallet, needs 3 confirmation", async () => {
    // for the multisigwallet, we need to submit encoded function call
    let encoded = Web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.addOwner, [newMember]);
    let txRp = await multiSigWalletInst.submitTransaction(multiSigWalletAddr, 0, encoded, {
      from: sender
    });
    let txId = txRp.tx;
    console.log("multiSigWalletInst.submitTransaction txId:", txId);
    // this is second confirmation(the first is from submitTransaction by sender)
    let firsConfirm = await multiSigWalletInst.confirmTransaction(0, {
      from: owners[1]
    });
    // newMember is not added yet, since we need one more.
    assert.equal(await multiSigWalletInst.isOwner(newMember), false);
    let secondConfirm = await multiSigWalletInst.confirmTransaction(0, {
      from: owners[2]
    });
    // newMember is added with third confirm.
    assert.equal(await multiSigWalletInst.isOwner(newMember), true);
  })


  it("Upgrade V1 to V2 on same proxy address", async () => {
    // set the position of an implementation
    await myProxyInst.upgradeTo(xXtokenAddr);
    // initialize token sc with deployed proxy address
    const proxiedXXTKV1 = await xXtoken.at(myProxyInst.address);
    await proxiedXXTKV1.initialize("xXtoken", "XXTK", 18, web3.utils.toHex(new BigNumber(100*10**18)));

    console.log("myProxyInst.address:", myProxyInst.address);
    console.log("proxiedXXTKV1.address:", proxiedXXTKV1.address);
    assert.equal(myProxyInst.address, proxiedXXTKV1.address);

    // set the position of an updated implementation
    await myProxyInst.upgradeTo(xXtokenV2Addr);
    // initialize token sc with deployed proxy address
    const proxiedXXTKV2 = await xXtokenV2.at(myProxyInst.address);

    console.log("myProxyInst.address:", myProxyInst.address);
    console.log("proxiedXXTKV2.address:", proxiedXXTKV2.address);
    assert.equal(myProxyInst.address, proxiedXXTKV2.address);
    assert.equal(proxiedXXTKV2.address, proxiedXXTKV1.address);
  })


  it("Creates new address by calling implementation", async () => {
    const tx = await myProxyInst.upgradeTo(xXtokenInst.address);
    const newAddress = await myProxyInst.implementation();
    console.log(xXtokenInst.address, newAddress);
    assert.equal(xXtokenInst.address, newAddress);

    const tx2 = await myProxyInst.upgradeTo(xXtokenV2Inst.address);
    const newAddress2 = await myProxyInst.implementation();
    console.log(xXtokenV2Inst.address, newAddress2);
    assert.equal(xXtokenV2Inst.address, newAddress2);
  });


  it("Checking proxy owner and change the owner of proxy", async () => {
    const proxyOwnerAddress = await myProxyInst.proxyOwner();
    console.log("proxy owner address:", proxyOwnerAddress);
    assert.equal(accounts[0], proxyOwnerAddress);

    await myProxyInst.updateProxyOwnership(accounts[1]);
    const proxyOwnerAddress2 = await myProxyInst.proxyOwner();
    console.log("proxy owner address:", proxyOwnerAddress2);
    assert.equal(accounts[1], proxyOwnerAddress2);
  });


  it("Change version number in storage", async () => {
    let myProxyInst = await deployProxy();
    const tokenContract1 = await xXtoken.new();
    await myProxyInst.upgradeTo(tokenContract1.address);

    const proxiedXXTKV1 = await xXtoken.at(myProxyInst.address);
    await proxiedXXTKV1.initialize("xXtoken", "XXTK", 18, web3.utils.toHex(new BigNumber(100*10**18)));
    let response1 = await proxiedXXTKV1.setDBVersion(2);
    console.log(response1.logs[0].args);
    console.log(response1.logs[0].args.version.toString()); // this has to be 1.
    assert.equal(response1.logs[0].args.version.toString(), 1);

    let versionfirstCall = await proxiedXXTKV1.getDBVersion();
    console.log(versionfirstCall.toString()); // this has to be 2.
    assert.equal(versionfirstCall.toString(), 2);

    const tokenContract2 = await xXtokenV2.new();
    await myProxyInst.upgradeTo(tokenContract2.address);
    const proxiedXXTKV2 = await xXtokenV2.at(myProxyInst.address);
    await proxiedXXTKV2.setDBVersion(3);

    let versionsecondCall = await proxiedXXTKV2.getDBVersion();
    console.log(versionsecondCall.toString()); // tihs has to be 3.
    assert.equal(versionsecondCall.toString(), 3);
  });


  it("Update list", async () => {
    let myProxyInst = await deployProxy();
    let tokenContract1 = await xXtoken.new();
    await myProxyInst.upgradeTo(tokenContract1.address);
    console.log("Proxy Contract Address 1: ", myProxyInst.address);

    const proxiedXXTKV1 = await xXtoken.at(myProxyInst.address);
    await proxiedXXTKV1.initialize("xXtoken", "XXTK", 18, web3.utils.toHex(new BigNumber(100*10**18)));
    await proxiedXXTKV1.addListItem("xXtoken first creation - +_+;");
    let item0 = await proxiedXXTKV1.getListItem(0);
    console.log("List Item 0: ", item0);

    const tokenContract2 = await xXtokenV2.new();
    await myProxyInst.upgradeTo(tokenContract2.address);
    const proxiedXXTKV2 = await xXtokenV2.at(myProxyInst.address);
    console.log("Proxy Contract Address 2: ", proxiedXXTKV2.address);

    await proxiedXXTKV2.addListItem("xXtokenV2 proxied upgrade - +_+;");
    let item00 = await proxiedXXTKV2.getListItem(0);
    let item11 = await proxiedXXTKV2.getListItem(1);
    console.log(item00, item11);
    assert.equal(item00, "xXtoken first creation - +_+;");
    assert.equal(item11, "xXtokenV2 proxied upgrade - +_+;");
  });


  it("Change SC version number", async () => {
    let myProxyInst = await deployProxy();
    let tokenContract1 = await xXtoken.new();
    await myProxyInst.upgradeTo(tokenContract1.address);
    console.log("Proxy Contract Address 1:", myProxyInst.address);

    let proxiedXXTKV1 = await xXtoken.at(myProxyInst.address);
    await proxiedXXTKV1.initialize("xXtoken", "XXTK", 18, web3.utils.toHex(new BigNumber(100*10**18)));
    console.log("Balance of XXTK V1:", await proxiedXXTKV1.balanceOf(accounts[0]).toString());
    let scV1 = await proxiedXXTKV1.contractVersion();
    console.log("Contract version:", scV1);
    assert.equal(scV1, "v1");

    let tokenContract2 = await xXtokenV2.new();
    await myProxyInst.upgradeTo(tokenContract2.address);
    let proxiedXXTKV2 = await xXtokenV2.at(myProxyInst.address);
    console.log("Proxy Contract Address 2:", proxiedXXTKV2.address);
    let scV2 = await proxiedXXTKV2.contractVersion();
    console.log("Contract version:", scV2);
    assert.equal(scV2, "v2");
  });


});
