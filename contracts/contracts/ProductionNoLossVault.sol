// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IAavePoolAddressesProvider {
    function getPool() external view returns (address);
}

contract ProductionNoLossVault is Ownable {
    IERC20 public immutable stablecoin;
    IERC20 public immutable aToken; // aUSDT
    IAavePoolAddressesProvider public immutable poolAddressesProvider;

    uint256 public totalStaked;
    uint256 public creditsPerTokenPerSecond = 158440000000;

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
    event YieldHarvested(address indexed receiver, uint256 amount);

    constructor(address _stablecoin, address _aToken, address _provider) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
        aToken = IERC20(_aToken);
        poolAddressesProvider = IAavePoolAddressesProvider(_provider);
    }

    function setCreditsPerTokenPerSecond(uint256 newRate) external onlyOwner {
        creditsPerTokenPerSecond = newRate;
    }

    function setAuthorizedSpender(address spender, bool status) external onlyOwner {
        authorizedSpenders[spender] = status;
        emit SpenderAuthorized(spender, status);
    }

    function _getAavePool() internal view returns (IAavePool) {
        return IAavePool(poolAddressesProvider.getPool());
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        updateCredits(msg.sender);
        
        stablecoin.transferFrom(msg.sender, address(this), amount);
        
        IAavePool pool = _getAavePool();
        stablecoin.approve(address(pool), amount);
        pool.supply(address(stablecoin), amount, address(this), 0);

        users[msg.sender].balance += amount;
        totalStaked += amount;
        
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        UserInfo storage user = users[msg.sender];
        require(user.balance >= amount, "Insufficient balance");
        updateCredits(msg.sender);
        
        user.balance -= amount;
        totalStaked -= amount;

        IAavePool pool = _getAavePool();
        pool.withdraw(address(stablecoin), amount, msg.sender);
        
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

    function harvestYield(address to) external onlyOwner {
        uint256 vaultTotalBalance = aToken.balanceOf(address(this));
        if (vaultTotalBalance > totalStaked) {
            uint256 surplus = vaultTotalBalance - totalStaked;
            IAavePool pool = _getAavePool();
            pool.withdraw(address(stablecoin), surplus, to);
            emit YieldHarvested(to, surplus);
        }
    }
}
