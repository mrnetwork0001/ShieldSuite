// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./NoLossVault.sol";
import "./PlayerShares.sol";

contract PlayerDex is Ownable {
    NoLossVault public vault;
    PlayerShares public shares;
    
    // Spread for selling (e.g. 95% of buy price returned)
    uint256 public constant SELL_MULTIPLIER = 95;
    
    event SharesBought(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 creditCost);
    event SharesSold(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 creditEarned);
    
    constructor(address _vault, address _shares) Ownable(msg.sender) {
        vault = NoLossVault(_vault);
        shares = PlayerShares(_shares);
    }
    
    function getSharePrice(uint256 tokenId) public view returns (uint256) {
        (,, uint256 rating,,) = shares.players(tokenId);
        require(rating > 0, "Invalid player tokenId");
        // 1 Share = rating * 1e18 (e.g., 90 rating = 90 credits)
        return rating * 10**18;
    }
    
    function buyShares(uint256 tokenId, uint256 amount) external {
        buySharesFor(msg.sender, tokenId, amount);
    }
    
    function buySharesFor(address user, uint256 tokenId, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        uint256 pricePerShare = getSharePrice(tokenId);
        uint256 totalCost = (pricePerShare * amount) / 10**18; // Keep decimals correct
        
        if (msg.sender != user) {
            (, , , address delegatedAgent) = vault.users(user);
            require(msg.sender == delegatedAgent || msg.sender == owner(), "Unauthorized agent");
        }
        
        // Spend credits from user's vault balance
        vault.spendCredits(user, totalCost);
        
        // Mint the player shares to the user
        shares.mint(user, tokenId, amount, "");
        
        emit SharesBought(user, tokenId, amount, totalCost);
    }
    
    function sellShares(uint256 tokenId, uint256 amount) external {
        sellSharesFor(msg.sender, tokenId, amount);
    }
    
    function sellSharesFor(address user, uint256 tokenId, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        uint256 pricePerShare = getSharePrice(tokenId);
        uint256 totalValue = (pricePerShare * amount) / 10**18;
        uint256 totalRefund = (totalValue * SELL_MULTIPLIER) / 100;
        
        if (msg.sender != user) {
            (, , , address delegatedAgent) = vault.users(user);
            require(msg.sender == delegatedAgent || msg.sender == owner(), "Unauthorized agent");
        }
        
        // Burn the shares from the user
        shares.burn(user, tokenId, amount);
        
        // Add credits back to the user's vault balance
        vault.addCredits(user, totalRefund);
        
        emit SharesSold(user, tokenId, amount, totalRefund);
    }
}
