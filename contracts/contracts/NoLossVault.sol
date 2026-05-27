// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NoLossVault
 * @notice Deposits stablecoins and earns virtual "Scout Credits" based on block yield.
 *         Principal is 100% safe and withdrawable at any time.
 */
contract NoLossVault is Ownable {
    IERC20 public stablecoin;
    
    // Virtual yield rate (e.g., 5% APY simulated for hackathon demo - scaled up for fast testing)
    uint256 public creditsPerTokenPerSecond = 158440000000;
    
    function setCreditsPerTokenPerSecond(uint256 newRate) external onlyOwner {
        creditsPerTokenPerSecond = newRate;
    }
    
    struct UserInfo {
        uint256 balance;
        uint256 lastUpdated;
        uint256 accumulatedCredits;
        address delegatedAgent;
    }
    
    mapping(address => UserInfo) public users;
    mapping(address => bool) public authorizedSpenders;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event AgentDelegated(address indexed user, address indexed agent);
    event SpenderAuthorized(address indexed spender, bool status);
    
    constructor(address _stablecoin) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
    }
    
    function setAuthorizedSpender(address spender, bool status) external onlyOwner {
        authorizedSpenders[spender] = status;
        emit SpenderAuthorized(spender, status);
    }
    
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        updateCredits(msg.sender);
        
        stablecoin.transferFrom(msg.sender, address(this), amount);
        users[msg.sender].balance += amount;
        
        emit Deposited(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external {
        UserInfo storage user = users[msg.sender];
        require(user.balance >= amount, "Insufficient balance");
        updateCredits(msg.sender);
        
        user.balance -= amount;
        stablecoin.transfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function delegateAgent(address agent) external {
        updateCredits(msg.sender);
        users[msg.sender].delegatedAgent = agent;
        emit AgentDelegated(msg.sender, agent);
    }
    
    function updateCredits(address userAddress) public {
        UserInfo storage user = users[userAddress];
        if (user.balance > 0) {
            uint256 elapsed = block.timestamp - user.lastUpdated;
            uint256 earned = (user.balance * elapsed * creditsPerTokenPerSecond) / 1e12;
            user.accumulatedCredits += earned;
        }
        user.lastUpdated = block.timestamp;
    }
    
    function getCredits(address userAddress) external view returns (uint256) {
        UserInfo memory user = users[userAddress];
        if (user.balance == 0) return user.accumulatedCredits;
        uint256 elapsed = block.timestamp - user.lastUpdated;
        uint256 earned = (user.balance * elapsed * creditsPerTokenPerSecond) / 1e12;
        return user.accumulatedCredits + earned;
    }

    function spendCredits(address userAddress, uint256 amount) external {
        UserInfo storage user = users[userAddress];
        require(msg.sender == user.delegatedAgent || msg.sender == owner() || authorizedSpenders[msg.sender], "Unauthorized spender");
        updateCredits(userAddress);
        require(user.accumulatedCredits >= amount, "Insufficient credits");
        user.accumulatedCredits -= amount;
    }

    function addCredits(address userAddress, uint256 amount) external {
        require(msg.sender == owner() || authorizedSpenders[msg.sender], "Unauthorized caller");
        updateCredits(userAddress);
        users[userAddress].accumulatedCredits += amount;
    }
}
