//SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Upgradeable, SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./interfaces/IUniswap.sol";
import "./interfaces/IWETH.sol";

error TokenRelease__UpkeepNotNeeded(uint256, uint256, uint256);
error Withdraw__AmountToWithdrawBiggerThanBalance();

contract DCAProtocol is KeeperCompatibleInterface {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    event Perform_Upkeep();
    event FundsDeposited(address token, uint256 amount);
    event FundsWithdrawn(address token, uint256 amount);
    event SwapSuccessfull(
        address token0,
        uint256 amount0,
        address token1,
        uint256 amount1
    );

    uint256 public gasBalance;
    mapping(address => uint256) public tokenBalance;

    address private constant usdc = 0x07865c6E87B9F70255377e024ace6630C1Eaa37F;
    address public constant WETH = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;
    address private constant UNISWAP_v2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    address[] public tokenAddresses;
    address public s_tokenAddress;
    address immutable i_owner;
    address public depositedToken;

    uint256 private s_interval;
    uint256 private s_amount;
    uint256 public lastTimeStamp;
    uint256 public gasFund;

    modifier onlyOwner() {
        require(msg.sender == i_owner);
        _;
    }

    constructor(uint _interval, uint _amount) {
        i_owner = msg.sender;

        s_interval = _interval;
        s_amount = _amount;
        tokenAddresses.push(WETH);
    }

    //sets payout amount
    function setAmount(uint256 _amount) public onlyOwner {
        s_amount = _amount;
    }

    //sets interval of the payout window
    function setInterval(uint _interval) public onlyOwner {
        s_interval = _interval;
    }

    //checks for setting a new timestamp
    function checkTimestamp() public view returns (bool) {
        if (
            block.timestamp >= lastTimeStamp + s_interval &&
            s_amount > tokenBalance[usdc]
        ) {
            return true;
        } else return false;
    }

    function convertToWeth() external payable {
        uint256 eth = getBal();
        IWETH(WETH).deposit{value: eth}();
    }

    // whatever the user deposit is added to msg.value of the sender address we mapped above
    function depositFunds(address _tokenAddress, uint256 _tokenAmount)
        external
    {
        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);
        uint256 preBalance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), _tokenAmount);
        uint256 postBalance = token.balanceOf(address(this));
        uint256 depositAmount = postBalance - preBalance;
        tokenBalance[_tokenAddress] += depositAmount;

        lastTimeStamp = block.timestamp;
        depositedToken = _tokenAddress;
        emit FundsDeposited(depositedToken, depositAmount);
    }

    //withdraw swapped tokens
    function withdrawFunds(address _tokenAddress, uint256 _tokenAmount)
        external
        onlyOwner
    {
        uint256 userBalance = tokenBalance[_tokenAddress];

        require(
            userBalance >= _tokenAmount,
            "Cannot withdraw more than deposited!"
        );

        if (_tokenAddress == WETH) {
            (bool success, ) = msg.sender.call{value: _tokenAmount}("");
            require(success, "withdraw funds failed!");
        } else {
            SafeERC20Upgradeable.safeTransfer(
                IERC20Upgradeable(_tokenAddress),
                msg.sender,
                _tokenAmount
            );
        }
        emit FundsWithdrawn(_tokenAddress, _tokenAmount);
    }

    //enables you to change interval
    function changeInterval(uint256 input_interval) public onlyOwner {
        s_interval = input_interval;
    }

    //enables yoz to change swapping amount
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
        bool timePassed = ((block.timestamp - lastTimeStamp) > s_interval);
        bool hasBalance = tokenBalance[depositedToken] > 0;

        upkeepNeeded = (timePassed && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert TokenRelease__UpkeepNotNeeded(
                lastTimeStamp,
                s_interval,
                block.timestamp
            );
        }
        swap(usdc, s_tokenAddress, s_amount);
        emit Perform_Upkeep();
        lastTimeStamp = block.timestamp;
    }

    //deposit funds for uniswap trades
    function depositGas() public payable {
        uint256 depositAmount = msg.value;
        gasBalance += depositAmount;

        emit FundsDeposited(WETH, depositAmount);
    }

    receive() external payable {
        depositGas();
    }

    fallback() external payable {
        depositGas();
    }

    // withdraw gas
    function withdrawGas(uint256 _tokenAmount) external onlyOwner {
        require(
            gasBalance >= _tokenAmount,
            "Cannot withdraw more gas than deposited!"
        );
        gasBalance = gasBalance - _tokenAmount;

        (bool success, ) = msg.sender.call{value: _tokenAmount}("");
        require(success, "withdrawGas failed!");

        emit FundsWithdrawn(WETH, _tokenAmount);
    }

    function swap(
        address _tokenIn,
        address _tokenOut,
        uint _amountIn
    ) public {
        require(
            IERC20(_tokenIn).approve(UNISWAP_v2_ROUTER, _amountIn),
            "approve failed"
        );
        uint256 amountOutMin = getAmountOutMin(_tokenIn, _tokenOut, _amountIn);
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH;
            path[2] = _tokenOut;
        }
        uint deadline = block.timestamp + 300;
        IUniswapV2Router(UNISWAP_v2_ROUTER).swapExactTokensForTokens(
            _amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
    }

    function getAmountOutMin(
        address _tokenIn,
        address _tokenOut,
        uint _amountIn
    ) internal view returns (uint) {
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH;
            path[2] = _tokenOut;
        }

        // same length as path
        uint[] memory amountOutMins = IUniswapV2Router(UNISWAP_v2_ROUTER)
            .getAmountsOut(_amountIn, path);

        return amountOutMins[path.length - 1];
    }

    /**@dev
     * here are the getter functions located
     */

    function getBal() public view returns (uint256) {
        return address(this).balance;
    }

    function getFunds() public view returns (uint256) {
        return tokenBalance[depositedToken];
    }

    function getLastTimeStamp() public view returns (uint256) {
        return lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return s_interval;
    }

    function getAmount() public view returns (uint256) {
        return s_amount;
    }

    function getTimeLeft() public view returns (uint256) {
        return block.timestamp - (lastTimeStamp + s_interval);
    }
}
