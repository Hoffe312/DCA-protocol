//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error TokenRelease__IntervalIsNotFinished();
error TokenRelease__UpkeepNotNeeded(uint256, uint256, uint256);
error TokenRelease__NotEnoughFunds();

contract DCAProtocol is Ownable, KeeperCompatibleInterface {
    //we mapped the address of the caller balance in the contract

    enum tokenRelease {
        READY,
        WAIT
    }

    mapping(address => uint) private balances;

    address private i_owner;
    address private s_token;

    uint256 private s_interval;
    uint256 private s_amount;
    uint256 private s_lastTimeStamp;
    address[] private s_user;
    tokenRelease private s_tokenRelease;

    constructor(uint256 _amount, uint256 _interval) Ownable() {
        _transferOwnership(_msgSender());
        s_amount = _amount;
        s_interval = _interval;
    }

    // whatever the user deposit is added to msg.value of the sender address we mapped above
    function deposit() public payable {
        balances[msg.sender] += msg.value;
        s_user.push(payable(msg.sender));
    }

    //we create the fucntion of witdraw
    function withdraw(uint _amount) private {
        if (balances[msg.sender] < _amount) {
            revert TokenRelease__NotEnoughFunds();
        }
        //if the amount is availabe we subtract it from the sender
        balances[msg.sender] -= _amount;
        //True bool is called to confirm the amount
        (bool sent, ) = msg.sender.call{value: _amount}("Sent");
        require(sent, "failed to send ETH");
    }

    function changeInterval(uint256 _interval) public onlyOwner {
        s_interval = _interval;
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        // require(upkeepNeeded, "Upkeep not needed");
        if (!upkeepNeeded) {
            revert TokenRelease__UpkeepNotNeeded(
                address(this).balance,
                s_user.length,
                uint256(s_tokenRelease)
            );
        }
        s_tokenRelease = tokenRelease.WAIT;
        s_lastTimeStamp = block.timestamp;

        withdraw(s_amount);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > s_interval);
        bool hasUsers = s_user.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (timePassed && hasBalance && hasUsers);
        return (upkeepNeeded, "0x0"); // can we comment this out?
    }

    function getBal() public view returns (uint256) {
        return address(this).balance;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return s_interval;
    }

    function getNumberOfUser() private view returns (uint256) {
        return s_user.length;
    }
}
