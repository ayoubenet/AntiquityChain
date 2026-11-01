// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @notice Records declared provenance and expert attestations for unique antiquity NFTs.
/// @dev An attestation records an expert's statement; it does not prove physical authenticity.
contract AntiquityRegistry is ERC721URIStorage, AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant EXPERT_ROLE = keccak256("EXPERT_ROLE");

    struct Antique {
        string name;
        string origin;
        string period;
        string provenanceURI;
        bytes32 evidenceHash;
        bool verified;
        address verifiedBy;
        uint256 verifiedAt;
    }

    uint256 private nextTokenId = 1;
    mapping(uint256 => Antique) private antiques;

    event AntiqueRegistered(uint256 indexed tokenId, address indexed initialOwner, bytes32 evidenceHash);
    event AntiqueVerified(uint256 indexed tokenId, address indexed expert);

    constructor() ERC721("AntiquityChain", "ANTQ") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _grantRole(EXPERT_ROLE, msg.sender);
    }

    function registerAntique(
        address initialOwner,
        string calldata name,
        string calldata origin,
        string calldata period,
        string calldata metadataURI,
        string calldata provenanceURI,
        bytes32 evidenceHash
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 tokenId) {
        require(initialOwner != address(0), "Invalid owner");
        require(bytes(name).length != 0, "Missing name");
        require(bytes(origin).length != 0, "Missing origin");
        require(bytes(period).length != 0, "Missing period");
        require(bytes(metadataURI).length != 0, "Missing metadata");
        require(bytes(provenanceURI).length != 0, "Missing provenance");
        require(evidenceHash != bytes32(0), "Missing evidence hash");

        tokenId = nextTokenId++;
        antiques[tokenId] = Antique({
            name: name,
            origin: origin,
            period: period,
            provenanceURI: provenanceURI,
            evidenceHash: evidenceHash,
            verified: false,
            verifiedBy: address(0),
            verifiedAt: 0
        });
        _setTokenURI(tokenId, metadataURI);
        _safeMint(initialOwner, tokenId);
        emit AntiqueRegistered(tokenId, initialOwner, evidenceHash);
    }

    function getAntique(uint256 tokenId) external view returns (Antique memory) {
        ownerOf(tokenId);
        return antiques[tokenId];
    }

    function verifyAntique(uint256 tokenId) external onlyRole(EXPERT_ROLE) {
        ownerOf(tokenId);
        require(!antiques[tokenId].verified, "Already verified");

        antiques[tokenId].verified = true;
        antiques[tokenId].verifiedBy = msg.sender;
        antiques[tokenId].verifiedAt = block.timestamp;
        emit AntiqueVerified(tokenId, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
