// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.4 || ^0.7.6 || ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComptrollerInterface.sol";
import "./VBep20Storage.sol";

contract TokenMetadata is Ownable {
    mapping(address => address) public vTokens;

    function add(address _underlying, address _vToken) public {
        ComptrollerInterface comptroller = ComptrollerInterface(
            0xfD36E2c2a6789Db23113685031d7F16329158384
        );
        (bool isvToken, ) = comptroller.markets(_vToken);
        VBep20Storage vToken = VBep20Storage(_vToken);
        require(vToken.underlying() == _underlying);
        require(isvToken, "vToken does not exist");
        require(vTokens[_underlying] != _vToken, "Pair already exists!");
        vTokens[_underlying] = _vToken;
    }

    function addBNB() public {
        require(
            vTokens[0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c] == address(0)
        );
        vTokens[
            0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
        ] = 0xA07c5b74C9B40447a954e1466938b865b6BBea36;
    }
}
