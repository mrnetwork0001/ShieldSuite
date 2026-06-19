// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PlayerShares is ERC1155, Ownable {
    using Strings for uint256;
    
    string public name = "X-Cup Player Shares";
    string public symbol = "XCPS";
    
    // Player metadata
    struct PlayerStats {
        string nameString;
        string country;
        uint256 rating; // Current dynamic rating (e.g. 88)
        uint256 goals;
        uint256 assists;
    }
    
    mapping(uint256 => PlayerStats) public players;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => bool) public authorizedMinters;
    mapping(uint256 => uint256) public totalSupply;
    
    event PlayerUpdated(uint256 indexed tokenId, uint256 rating, uint256 goals, uint256 assists, string metadataUri);
    event MinterAuthorized(address indexed minter, bool status);
    
    constructor() ERC1155("") Ownable(msg.sender) {
        // Initialize top 5 players for the demo
        _registerPlayer(1, "Lionel Messi", "Argentina", 90);
        _registerPlayer(2, "Kylian Mbappe", "France", 91);
        _registerPlayer(3, "Bukayo Saka", "England", 87);
        _registerPlayer(4, "Erling Haaland", "Norway", 90);
        _registerPlayer(5, "Vinicius Junior", "Brazil", 89);
    }
    
    function setAuthorizedMinter(address minter, bool status) external onlyOwner {
        authorizedMinters[minter] = status;
        emit MinterAuthorized(minter, status);
    }
    
    function _registerPlayer(uint256 id, string memory _name, string memory _country, uint256 _rating) internal {
        players[id] = PlayerStats(_name, _country, _rating, 0, 0);
        _tokenURIs[id] = string(abi.encodePacked("https://api.pitchside.ai/metadata/", id.toString()));
    }
    
    function updatePlayer(
        uint256 id, 
        uint256 rating, 
        uint256 goals, 
        uint256 assists, 
        string calldata newUri
    ) external onlyOwner {
        require(bytes(players[id].nameString).length > 0, "Player does not exist");
        players[id].rating = rating;
        players[id].goals = goals;
        players[id].assists = assists;
        
        if (bytes(newUri).length > 0) {
            _tokenURIs[id] = newUri;
        }
        
        emit PlayerUpdated(id, rating, goals, assists, _tokenURIs[id]);
    }
    
    function uri(uint256 id) public view override returns (string memory) {
        return _tokenURIs[id];
    }
    
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external {
        require(msg.sender == owner() || authorizedMinters[msg.sender], "Unauthorized minter");
        totalSupply[id] += amount;
        _mint(to, id, amount, data);
    }
    
    function burn(address from, uint256 id, uint256 amount) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender) || authorizedMinters[msg.sender], "Not authorized to burn");
        totalSupply[id] -= amount;
        _burn(from, id, amount);
    }
}
