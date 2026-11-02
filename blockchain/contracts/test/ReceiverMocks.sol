// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @dev Test-only recipient that accepts ERC-721 tokens through safeTransferFrom.
contract ERC721ReceiverMock is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

/// @dev Test-only contract without onERC721Received: safeTransferFrom to it must revert.
contract NonReceiverMock {}
