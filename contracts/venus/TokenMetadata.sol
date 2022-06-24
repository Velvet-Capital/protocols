// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

contract TokenMetadata {
    mapping(address => address) public vTokens;

    function add(address _underlying, address _vToken) public {
        vTokens[_underlying] = _vToken;
    }
}
