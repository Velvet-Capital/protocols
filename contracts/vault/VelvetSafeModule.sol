// SPDX-License-Identifier: LGPL-3.0-only

/**
 * @title MyModule for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for creating a bridge between the contract and the gnosis safe vault
 * @dev This contract includes functionalities:
 *      1. Add a new owner of the vault
 *      2. Transfer BNB and other tokens to and fro from vault
 */
pragma solidity ^0.8.6;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";

interface InputData {
    function transfer(address _to, uint256 _value) external;
}

contract VelvetSafeModule is Module {
    address public moduleOwner;

    mapping(address => bool) public owners;

    constructor(address _owner) {
        bytes memory initializeParams = abi.encode(_owner);
        setUp(initializeParams);
        owners[msg.sender] = true;
    }

    modifier onlyModuleOwner() {
        require(owners[msg.sender]);
        _;
    }

    function addOwner(address newOwner) public onlyModuleOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        owners[newOwner] = true;
    }

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams Parameters of initialization encoded
    function setUp(bytes memory initializeParams) public override initializer {
        __Ownable_init();
        address _owner = abi.decode(initializeParams, (address));

        setAvatar(_owner);
        setTarget(_owner);
        transferOwnership(_owner);
    }

    function executeTransactionETH(address _to, uint256 value)
        public
        onlyModuleOwner
        returns (bool success)
    {
        success = exec(_to, value, new bytes(0), Enum.Operation.Call);
    }

    function executeTransactionOther(
        address _to,
        uint256 value,
        address _token
    ) public onlyModuleOwner returns (bool success) {
        bytes memory inputData = abi.encodeWithSelector(
            InputData.transfer.selector,
            _to,
            value
        );

        success = exec(_token, 0, inputData, Enum.Operation.Call);
    }
}
