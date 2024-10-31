// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/utils/Randomness.sol";

contract Raffle {
    enum RaffleState { Open, Closed }

    struct Participant {
        address participantAddress;
        bool hasClaimed;
    }

    address public manager;
    address public nftAddress;
    uint256 public nftId;
    uint256 public entryFee;
    Participant[] public participants;
    RaffleState public state;

    event RaffleEntered(address indexed participant);
    event RaffleWon(address indexed winner, uint256 indexed nftId);
    event RaffleRefunded(address indexed participant, uint256 amount);
    event RaffleClosed();

    modifier onlyManager() {
        require(msg.sender == manager, "Only the manager can call this function");
        _;
    }

    modifier onlyOpen() {
        require(state == RaffleState.Open, "Raffle is not open");
        _;
    }

    constructor(address _nftAddress, uint256 _nftId, uint256 _entryFee) {
        manager = msg.sender;
        nftAddress = _nftAddress;
        nftId = _nftId;
        entryFee = _entryFee;
        state = RaffleState.Open;
    }

    function enterRaffle() external payable onlyOpen {
        require(msg.value == entryFee, "Incorrect entry fee");

        participants.push(Participant(msg.sender, false));
        emit RaffleEntered(msg.sender);
    }

    function pickWinner() external onlyManager onlyOpen {
        require(participants.length > 0, "No participants in the raffle");

        
        uint256 winnerIndex = random() % participants.length;
        address winner = participants[winnerIndex].participantAddress;

        
        IERC721(nftAddress).transferFrom(manager, winner, nftId);

        
        participants[winnerIndex].hasClaimed = true;

        emit RaffleWon(winner, nftId);

        
        state = RaffleState.Closed;
        emit RaffleClosed();
    }

    function refundParticipants() external onlyManager {
        require(state == RaffleState.Closed, "Raffle is still open");

        for (uint256 i = 0; i < participants.length; i++) {
            if (!participants[i].hasClaimed) {
                (bool sent, ) = participants[i].participantAddress.call{value: entryFee}("");
                require(sent, "Failed to send Ether");
                emit RaffleRefunded(participants[i].participantAddress, entryFee);
            }
        }
    }

    function random() private view returns (uint256) {
    
    bytes32 hash = keccak256(abi.encodePacked(block.timestamp, participants.length));

    for (uint256 i = 0; i < participants.length; i++) {
        hash = keccak256(abi.encodePacked(hash, participants[i].participantAddress));
    }

    return uint256(hash);
}


    function getParticipants() external view returns (Participant[] memory) {
        return participants;
    }
}