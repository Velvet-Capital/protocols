  // SPDX-License-Identifier: UNLICENSED
    pragma solidity ^0.8.4;
    interface IVelvetSafeModule {

    function addOwner(address newOwner) external;

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams Parameters of initialization encoded
    function setUp(bytes memory initializeParams) external;

    function executeTransactionETH(address _to, uint256 value)
        external
        returns (bool success);

    function executeTransactionOther(
        address _to,
        uint256 value,
        address _token
    ) external returns (bool success) ;

   } 