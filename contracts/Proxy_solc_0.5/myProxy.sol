pragma solidity >=0.4.22 <0.7.0;


contract myProxy {

  bytes32 private constant implementationPosition = keccak256("arbitrary com.implementation.address +_+;");
  bytes32 private constant proxyOwnerPosition = keccak256("arbitrary com.example.proxy.owner +_+;");

  event upgradedLog(address indexed implementation);
  event updateProxyOwnershipLog(address currentPOwner, address newPOwner);

  modifier onlyProxyOwner(){
    require(msg.sender == proxyOwner());
    _;
  }

  constructor()
    public
  {
    _setUpgradeabilityOwner(msg.sender);
  }


	function() external payable {
    // the implementation method simply returns an address as defined by EIP897
		address implementation = implementation();

    assembly {
      // over write solidity code in memory level
      calldatacopy(0, 0, calldatasize)

      // call implementation
      // out and outsize are 0 because we don't know the size yet.
      let result := delegatecall(gas, implementation, 0, calldatasize, 0, 0)

      // copy the returned data
      returndatacopy(0, 0, returndatasize)

      // delegatecall returns 0 on error.
      switch result
        case 0 {
          revert(0, returndatasize)
        }
        default {
          return(0, returndatasize)
        }
    }
  }


  // set the position of an implementation from the implementation position onwards
  function _setImplementation(
    address _newImplementation
  ) internal {
    bytes32 position = implementationPosition;
    assembly {
      // storage[position]:=_newImplementation
      sstore(position, _newImplementation)
    }
  }


  // retrieving the address at the implementation position
  function implementation()
    public
    view returns (address impl)
  {
    bytes32 position = implementationPosition;
    assembly {
      impl := sload(position)
    }
  }


  function upgradeTo(address newImplementation) public {
    _setImplementation(newImplementation);
    emit upgradedLog(newImplementation);
  }


  function proxyOwner()
    public
    view returns (address owner)
  {
    bytes32 position = proxyOwnerPosition;
    assembly {
      owner := sload(position)
    }
  }


  function _setUpgradeabilityOwner(
    address _newProxyOwner
  )
    internal
  {
    bytes32 position = proxyOwnerPosition;
    assembly {
        sstore(position, _newProxyOwner)
    }
  }


  function updateProxyOwnership(
    address newOwner
  )
    public
    onlyProxyOwner
  {
    require(newOwner != address(0), "New owner cant be a zero address");
    emit updateProxyOwnershipLog(proxyOwner(), newOwner);
    _setUpgradeabilityOwner(newOwner);
  }


}
