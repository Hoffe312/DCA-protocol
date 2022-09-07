//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TimeLock.sol";

contract Governor is DCAProtocol {
    mapping(address => uint256) balanceUser;

    address private s_user;
    address[] private userArray;
    uint256 private s_interval;
    address private s_token;

    constructor(uint _interval, address _token) DCAProtocol() {
        s_user = msg.sender;
        s_interval = _interval;
        s_token = _token;
    }

    function changeToken(address _token) public {
        s_token = _token;
    }

    function getTokenAddress() public view returns (address) {
        return s_token;
    }
}
