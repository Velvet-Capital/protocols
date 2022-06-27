pragma solidity ^0.8.6;

interface ComptrollerInterface {
    function markets(address) external view returns (bool, uint256);
}
