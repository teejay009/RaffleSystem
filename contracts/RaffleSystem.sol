// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./RealToken.sol";

contract RaffleSystem {
    uint256 public entryFee;
    RealToken public nftContract;
    address[] public participants;
    bool public raffleOpen;
    uint256 public raffleCount;

    struct RaffleResult {
        address winner;
        uint256 tokenId;
        string tokenURI;
    }

    RaffleResult[] public raffleResults; 

    event RaffleEntered(address indexed participant);
    event WinnerSelected(address indexed winner);
    event RefundIssued(address indexed participant, uint256 amount);

    mapping(address => uint256) public refunds;

    constructor(uint256 _entryFee) {
        entryFee = _entryFee;
        nftContract = new RealToken();
        raffleOpen = true;
        raffleCount = 0;
    }

    modifier raffleIsOpen() {
        require(raffleOpen, "Raffle is closed");
        _;
    }

    function enterRaffle() external payable raffleIsOpen {
        require(msg.value == entryFee, "Incorrect entry fee");
        participants.push(msg.sender);
        emit RaffleEntered(msg.sender);
    }

    function closeRaffleAndSelectWinner() external {
        require(participants.length > 0, "No participants in raffle");

        uint256 winnerIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % participants.length;
        address winner = participants[winnerIndex];
        raffleOpen = false;
        raffleCount++;

        nftContract.mint(winner, raffleCount);

        raffleResults.push(RaffleResult({
            winner: winner,
            tokenId: raffleCount,
            tokenURI: nftContract.tokenURI(raffleCount)
        }));

        emit WinnerSelected(winner);

        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] != winner) {
                refunds[participants[i]] = entryFee;
            }
        }
    }

    function getRaffleResult(uint256 raffleIndex) external view returns (address, uint256, string memory) {
        require(raffleIndex < raffleResults.length, "Raffle does not exist");
        RaffleResult storage result = raffleResults[raffleIndex];
        return (result.winner, result.tokenId, result.tokenURI);
    }

    function withdrawRefund() external {
        require(refunds[msg.sender] > 0, "No refund available");

        uint256 refundAmount = refunds[msg.sender];
        refunds[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);

        emit RefundIssued(msg.sender, refundAmount);
    }

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    receive() external payable {}
    fallback() external payable {}
}