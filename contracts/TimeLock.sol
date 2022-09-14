//SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

error TokenRelease__UpkeepNotNeeded(uint256, uint256);

contract DCAProtocol is KeeperCompatibleInterface {
    //we mapped the address of the caller balance in the contract

    mapping(address => uint) public balances;

    event Perform_Upkeep();

    address private s_token;
    address immutable i_owner;

    uint256 private s_interval;
    uint256 private s_amount;
    uint256 public s_lastTimeStamp;
    address[] private s_user;

    modifier onlyOwner() {
        require(msg.sender == i_owner);
        _;
    }

    constructor(uint256 _amount, uint256 _interval) {
        s_amount = _amount;
        s_interval = _interval;
        i_owner = msg.sender;
    }

    // whatever the user deposit is added to msg.value of the sender address we mapped above
    function deposit() public payable {
        balances[msg.sender] += msg.value;
        s_user.push(payable(msg.sender));
        s_lastTimeStamp = block.timestamp;
    }

    function withdraw() internal {
        if (balances[i_owner] < s_amount) {
            uint256 leftBalance = balances[i_owner];
            (bool sent, ) = i_owner.call{value: leftBalance}("Sent");
            require(sent, "failed to send ETH");
        } else {
            balances[i_owner] -= s_amount;
            //True bool is called to confirm the amount
            (bool sent, ) = i_owner.call{value: s_amount}("Sent");
            require(sent, "failed to send ETH");
        }
        s_lastTimeStamp = block.timestamp;
    }

    function changeInterval(uint256 input_interval) public onlyOwner {
        s_interval = input_interval;
    }

    function changeAmount(uint256 input_amount) public onlyOwner {
        s_amount = input_amount;
    }

    /**
     * @dev the following should be true to return True
     * 1.The time interval has passed
     * 2.The contract balance > 0
     */

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
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (timePassed && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert TokenRelease__UpkeepNotNeeded(
                s_lastTimeStamp,
                block.timestamp
            );
        }
        withdraw();
        emit Perform_Upkeep();
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

    function getUser(uint256 index) public view returns (address) {
        return s_user[index];
    }

    function getAmount() public view returns (uint256) {
        return s_amount;
    }
}
