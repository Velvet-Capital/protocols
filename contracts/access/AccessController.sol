// SPDX-License-Identifier: MIT

/**
 * @title AccessController for the Index
 * @author Velvet.Capital
 * @notice You can use this contract to specify and grant different roles
 * @dev This contract includes functionalities:
 *      1. Checks if an address has role
 *      2. Grant different roles to addresses
 */

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../core/IndexSwap.sol";

contract AccessController is AccessControl {
    bytes32 public constant ASSET_MANAGER_ROLE =
        keccak256("ASSET_MANAGER_ROLE");

    bytes32 public constant INDEX_MANAGER_ROLE =
        keccak256("INDEX_MANAGER_ROLE");

    bytes32 public constant REBALANCER_CONTRACT =
        keccak256("REBALANCER_CONTRACT");

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setRoleAdmin(
            keccak256("ASSET_MANAGER_ROLE"),
            keccak256("DEFAULT_ADMIN_ROLE")
        );

        _setRoleAdmin(
            keccak256("INDEX_MANAGER_ROLE"),
            keccak256("DEFAULT_ADMIN_ROLE")
        );
    }

    modifier onlyAdmin(bytes32 role) {
        hasRole(getRoleAdmin(role), msg.sender);
        _;
    }

    function isAssetManager(address account) external view returns (bool) {
        return hasRole(ASSET_MANAGER_ROLE, account);
    }

    function isIndexManager(address account) external view returns (bool) {
        return hasRole(INDEX_MANAGER_ROLE, account);
    }

    function isRebalancerContract(address account)
        external
        view
        returns (bool)
    {
        return hasRole(REBALANCER_CONTRACT, account);
    }

    function setupRole(bytes32 role, address account) public onlyAdmin(role) {
        _setupRole(role, account);
    }
}
