pragma solidity >=0.4.22 <0.7.0;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/AccessControl.sol";


contract xXtoken is Initializable, AccessControlUpgradeSafe {

	using SafeMath for uint256;

	string public name;
	string public symbol;
	uint8 public decimal;
	uint256 public totalSupply;
	uint256 internal storedData;
	string[] internal itemList;

	mapping(address => uint256) balances;
	mapping(address => mapping(address => uint256)) allowed;

	event ApprovalLog(address indexed tokenOwner, address indexed spender, uint tokens);
	event TransferLog(address indexed from, address indexed to, uint tokens);
	event StoredValueLog(uint256 newData, uint256 previousData, uint256 version);
	event ItemAddedLog(string item);

	// no use of constructor for upgradable sc
	function initialize(
		string memory _n,
		string memory _s,
		uint8 _d,
		uint256 _t
	)
		public
		initializer
	{
		name = _n;
		symbol = _s;
		decimal =_d;
		totalSupply = _t;
		balances[msg.sender] = totalSupply;
		_setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
		emit TransferLog(address(this), msg.sender, totalSupply);
	}


	function balanceOf(
		address _tokenOwner
	)
		public
		view returns (uint256)
	{
		return balances[_tokenOwner];
	}


	function transfer(
		address _to,
		uint256 _amount
	)
		public returns (bool)
	{
		require(_amount <= balances[msg.sender]);
		balances[msg.sender] = balances[msg.sender].sub(_amount);
		balances[_to] = balances[_to].add(_amount);
		emit TransferLog(msg.sender, _to, _amount);
		return true;
	}


	function approve(
		address _to,
		uint256 _amount
	)
		public returns (bool)
	{
		allowed[msg.sender][_to] = _amount;
		emit ApprovalLog(msg.sender, _to, _amount);
		return true;
	}


	function allowance(
		address _owner,
		address _to
	)
		public
		view returns (uint256)
	{
		return allowed[_owner][_to];
	}


	function transferFrom(
		address _owner,
		address _to,
		uint256 _amount
	)
		public returns (bool)
	{
		require(_amount <= balances[_owner]);
		require(_amount <= allowance(_owner, msg.sender));
		balances[_owner] = balances[_owner].sub(_amount);
		allowed[_owner][msg.sender] = allowed[_owner][msg.sender].sub(_amount);
		balances[_to] = balances[_to].add(_amount);
		emit TransferLog(_owner, _to, _amount);
		return true;
	}


	function contractVersion()
		public
		pure returns (string memory)
	{
		return "v1";
	}


	function setDBVersion(
		uint256 _x
	)
		public
	{
		uint256 previousData = storedData;
		storedData = _x;
		emit StoredValueLog(_x, previousData, 1);
	}


	function getDBVersion()
		public
		view returns (uint256)
	{
		return storedData;
	}


	function addListItem(
		string memory newItem
	)
		public
	{
    itemList.push(newItem);
    emit ItemAddedLog(newItem);
  }


  function getListItem(
		uint256 index
	) public
		view returns (string memory)
	{
    return itemList[index];
  }


}
