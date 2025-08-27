// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint) public balances;

    event Deposit(address indexed user, uint amount);

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function getBalance(address user) public view returns (uint) {
        return balances[user];
    }
}
