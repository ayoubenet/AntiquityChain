// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Orchestrates transfers, declared sales and later provenance evidence for AntiquityRegistry NFTs.
/// @dev Ownership is never stored here: AntiquityRegistry.ownerOf(tokenId) is the single source of truth.
/// A declared sale records the seller's statement only; no payment is made or verified on-chain.
contract AntiquityTransactions is ReentrancyGuard {
    IERC721 public immutable registry;

    event AntiquityTransferred(uint256 indexed tokenId, address indexed from, address indexed to, address initiatedBy);
    event SaleDeclared(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 declaredPriceWei,
        bytes32 saleDocumentHash
    );
    event ProvenanceEvidenceAdded(
        uint256 indexed tokenId,
        address indexed submittedBy,
        bytes32 evidenceHash,
        string evidenceURI,
        string description
    );

    constructor(address registryAddress) {
        require(registryAddress.code.length > 0, "Registry must be a contract");
        registry = IERC721(registryAddress);
    }

    function transferAntique(uint256 tokenId, address to) external nonReentrant {
        _executeTransfer(tokenId, to);
    }

    function declareSaleAndTransfer(
        uint256 tokenId,
        address buyer,
        uint256 declaredPriceWei,
        bytes32 saleDocumentHash
    ) external nonReentrant {
        require(declaredPriceWei > 0, "Price must be positive");
        require(saleDocumentHash != bytes32(0), "Missing sale proof");

        address seller = _executeTransfer(tokenId, buyer);
        emit SaleDeclared(tokenId, seller, buyer, declaredPriceWei, saleDocumentHash);
    }

    /// @dev Evidence is an unreviewed owner statement, distinct from the Registry's expert attestation.
    function addProvenanceEvidence(
        uint256 tokenId,
        bytes32 evidenceHash,
        string calldata evidenceURI,
        string calldata description
    ) external {
        require(registry.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(evidenceHash != bytes32(0), "Missing evidence hash");
        require(bytes(evidenceURI).length != 0, "Missing evidence URI");

        emit ProvenanceEvidenceAdded(tokenId, msg.sender, evidenceHash, evidenceURI, description);
    }

    function _executeTransfer(uint256 tokenId, address to) private returns (address seller) {
        seller = registry.ownerOf(tokenId); // Reverts for an unknown token.
        require(msg.sender == seller, "Not token owner");
        require(to != address(0), "Invalid recipient");
        require(to != seller, "Already owner");
        require(
            registry.getApproved(tokenId) == address(this) || registry.isApprovedForAll(seller, address(this)),
            "Approve Transactions first"
        );

        // Inside the Registry, msg.sender is this contract, hence the prior ERC-721 approval.
        registry.safeTransferFrom(seller, to, tokenId);
        emit AntiquityTransferred(tokenId, seller, to, msg.sender);
    }
}
